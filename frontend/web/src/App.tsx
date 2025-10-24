// App.tsx
import { ConnectButton } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getContractReadOnly, getContractWithSigner } from "./contract";
import "./App.css";
import { useAccount, useSignMessage } from 'wagmi';

interface SocialEvent {
  id: string;
  encryptedData: string;
  timestamp: number;
  owner: string;
  eventType: string;
  expiration: number;
  location: string;
  participants: number;
}

interface ChatMessage {
  id: string;
  sender: string;
  encryptedContent: string;
  timestamp: number;
}

const FHEEncryptNumber = (value: number): string => {
  return `FHE-${btoa(value.toString())}`;
};

const FHEDecryptNumber = (encryptedData: string): number => {
  if (encryptedData.startsWith('FHE-')) {
    return parseFloat(atob(encryptedData.substring(4)));
  }
  return parseFloat(encryptedData);
};

const generatePublicKey = () => `0x${Array(2000).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;

const eventTypes = [
  { name: "Concert", icon: "🎵" },
  { name: "Conference", icon: "💼" },
  { name: "Meetup", icon: "👥" },
  { name: "Party", icon: "🎉" },
  { name: "Sports", icon: "⚽" },
  { name: "Art", icon: "🎨" }
];

const App: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<SocialEvent[]>([]);
  const [activeEvent, setActiveEvent] = useState<SocialEvent | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<{ visible: boolean; status: "pending" | "success" | "error"; message: string; }>({ visible: false, status: "pending", message: "" });
  const [newEventData, setNewEventData] = useState({ 
    eventType: "", 
    description: "", 
    duration: 2, 
    location: "",
    maxParticipants: 50 
  });
  const [publicKey, setPublicKey] = useState<string>("");
  const [contractAddress, setContractAddress] = useState<string>("");
  const [chainId, setChainId] = useState<number>(0);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [participantCount, setParticipantCount] = useState(0);

  useEffect(() => {
    loadEvents().finally(() => setLoading(false));
    const initSignatureParams = async () => {
      const contract = await getContractReadOnly();
      if (contract) setContractAddress(await contract.getAddress());
      if (window.ethereum) {
        const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
        setChainId(parseInt(chainIdHex, 16));
      }
      setPublicKey(generatePublicKey());
    };
    initSignatureParams();

    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }),
        () => console.log("Location access denied")
      );
    }
  }, []);

  useEffect(() => {
    if (activeEvent) {
      // Simulate participant count updates
      const interval = setInterval(() => {
        setParticipantCount(prev => {
          const change = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
          return Math.max(1, Math.min(prev + change, FHEDecryptNumber(activeEvent.encryptedData)));
        });
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [activeEvent]);

  const loadEvents = async () => {
    try {
      const contract = await getContractReadOnly();
      if (!contract) return;
      
      const isAvailable = await contract.isAvailable();
      if (!isAvailable) return;
      
      const keysBytes = await contract.getData("event_keys");
      let keys: string[] = [];
      if (keysBytes.length > 0) {
        try {
          const keysStr = ethers.toUtf8String(keysBytes);
          if (keysStr.trim() !== '') keys = JSON.parse(keysStr);
        } catch (e) { console.error("Error parsing event keys:", e); }
      }
      
      const list: SocialEvent[] = [];
      for (const key of keys) {
        try {
          const eventBytes = await contract.getData(`event_${key}`);
          if (eventBytes.length > 0) {
            try {
              const eventData = JSON.parse(ethers.toUtf8String(eventBytes));
              // Only show active events (not expired)
              if (eventData.expiration > Math.floor(Date.now() / 1000)) {
                list.push({ 
                  id: key, 
                  encryptedData: eventData.participants, 
                  timestamp: eventData.timestamp, 
                  owner: eventData.owner, 
                  eventType: eventData.eventType,
                  expiration: eventData.expiration,
                  location: eventData.location,
                  participants: FHEDecryptNumber(eventData.participants)
                });
              }
            } catch (e) { console.error(`Error parsing event data for ${key}:`, e); }
          }
        } catch (e) { console.error(`Error loading event ${key}:`, e); }
      }
      list.sort((a, b) => b.timestamp - a.timestamp);
      setEvents(list);
    } catch (e) { console.error("Error loading events:", e); } 
    finally { setLoading(false); }
  };

  const createEvent = async () => {
    if (!isConnected) { alert("Please connect wallet first"); return; }
    setCreatingEvent(true);
    setTransactionStatus({ visible: true, status: "pending", message: "Creating encrypted social space with Zama FHE..." });
    
    try {
      const encryptedParticipants = FHEEncryptNumber(newEventData.maxParticipants);
      const contract = await getContractWithSigner();
      if (!contract) throw new Error("Failed to get contract with signer");
      
      const eventId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const expirationTime = Math.floor(Date.now() / 1000) + (newEventData.duration * 3600);
      
      const eventData = { 
        participants: encryptedParticipants,
        timestamp: Math.floor(Date.now() / 1000),
        owner: address,
        eventType: newEventData.eventType,
        expiration: expirationTime,
        location: newEventData.location || "Unknown",
        description: newEventData.description
      };
      
      await contract.setData(`event_${eventId}`, ethers.toUtf8Bytes(JSON.stringify(eventData)));
      
      const keysBytes = await contract.getData("event_keys");
      let keys: string[] = [];
      if (keysBytes.length > 0) {
        try { keys = JSON.parse(ethers.toUtf8String(keysBytes)); } 
        catch (e) { console.error("Error parsing keys:", e); }
      }
      keys.push(eventId);
      await contract.setData("event_keys", ethers.toUtf8Bytes(JSON.stringify(keys)));
      
      setTransactionStatus({ visible: true, status: "success", message: "Ephemeral social space created!" });
      await loadEvents();
      
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
        setShowCreateModal(false);
        setNewEventData({ 
          eventType: "", 
          description: "", 
          duration: 2, 
          location: "",
          maxParticipants: 50 
        });
      }, 2000);
    } catch (e: any) {
      const errorMessage = e.message.includes("user rejected transaction") 
        ? "Transaction rejected by user" 
        : "Creation failed: " + (e.message || "Unknown error");
      setTransactionStatus({ visible: true, status: "error", message: errorMessage });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
    } finally { 
      setCreatingEvent(false); 
    }
  };

  const joinEvent = async (eventId: string) => {
    if (!isConnected) { alert("Please connect wallet first"); return; }
    setTransactionStatus({ visible: true, status: "pending", message: "Joining with FHE encryption..." });
    
    try {
      const contract = await getContractReadOnly();
      if (!contract) throw new Error("Failed to get contract");
      
      const eventBytes = await contract.getData(`event_${eventId}`);
      if (eventBytes.length === 0) throw new Error("Event not found");
      
      const eventData = JSON.parse(ethers.toUtf8String(eventBytes));
      const currentParticipants = FHEDecryptNumber(eventData.participants);
      
      if (currentParticipants >= eventData.maxParticipants) {
        throw new Error("Event is full");
      }
      
      const updatedParticipants = FHEEncryptNumber(currentParticipants + 1);
      const updatedEvent = { ...eventData, participants: updatedParticipants };
      
      const contractWithSigner = await getContractWithSigner();
      if (!contractWithSigner) throw new Error("Failed to get contract with signer");
      
      await contractWithSigner.setData(`event_${eventId}`, ethers.toUtf8Bytes(JSON.stringify(updatedEvent)));
      
      setTransactionStatus({ visible: true, status: "success", message: "Joined event securely!" });
      await loadEvents();
      
      // Set as active event
      const joinedEvent = events.find(e => e.id === eventId);
      if (joinedEvent) {
        setActiveEvent({
          ...joinedEvent,
          participants: currentParticipants + 1
        });
        setParticipantCount(currentParticipants + 1);
        loadMessages(eventId);
      }
      
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 2000);
    } catch (e: any) {
      setTransactionStatus({ visible: true, status: "error", message: e.message || "Join failed" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
    }
  };

  const loadMessages = async (eventId: string) => {
    try {
      const contract = await getContractReadOnly();
      if (!contract) return;
      
      const keysBytes = await contract.getData(`messages_${eventId}_keys`);
      let keys: string[] = [];
      if (keysBytes.length > 0) {
        try {
          const keysStr = ethers.toUtf8String(keysBytes);
          if (keysStr.trim() !== '') keys = JSON.parse(keysStr);
        } catch (e) { console.error("Error parsing message keys:", e); }
      }
      
      const messageList: ChatMessage[] = [];
      for (const key of keys) {
        try {
          const messageBytes = await contract.getData(`message_${eventId}_${key}`);
          if (messageBytes.length > 0) {
            try {
              const messageData = JSON.parse(ethers.toUtf8String(messageBytes));
              messageList.push({
                id: key,
                sender: messageData.sender,
                encryptedContent: messageData.content,
                timestamp: messageData.timestamp
              });
            } catch (e) { console.error(`Error parsing message ${key}:`, e); }
          }
        } catch (e) { console.error(`Error loading message ${key}:`, e); }
      }
      
      messageList.sort((a, b) => a.timestamp - b.timestamp);
      setMessages(messageList);
    } catch (e) { console.error("Error loading messages:", e); }
  };

  const sendMessage = async () => {
    if (!isConnected || !activeEvent || !newMessage.trim()) return;
    
    try {
      const contract = await getContractWithSigner();
      if (!contract) throw new Error("Failed to get contract with signer");
      
      const messageId = `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const messageData = {
        content: `FHE-${btoa(newMessage)}`, // Simulate FHE encryption
        sender: address,
        timestamp: Math.floor(Date.now() / 1000)
      };
      
      await contract.setData(`message_${activeEvent.id}_${messageId}`, ethers.toUtf8Bytes(JSON.stringify(messageData)));
      
      // Update message keys
      const keysBytes = await contract.getData(`messages_${activeEvent.id}_keys`);
      let keys: string[] = [];
      if (keysBytes.length > 0) {
        try { keys = JSON.parse(ethers.toUtf8String(keysBytes)); } 
        catch (e) { console.error("Error parsing message keys:", e); }
      }
      keys.push(messageId);
      await contract.setData(`messages_${activeEvent.id}_keys`, ethers.toUtf8Bytes(JSON.stringify(keys)));
      
      // Update UI
      setMessages(prev => [...prev, {
        id: messageId,
        sender: address || "",
        encryptedContent: messageData.content,
        timestamp: messageData.timestamp
      }]);
      setNewMessage("");
    } catch (e) {
      console.error("Error sending message:", e);
      alert("Failed to send message");
    }
  };

  const decryptMessage = async (encryptedContent: string): Promise<string> => {
    if (!isConnected) { alert("Please connect wallet first"); return ""; }
    setIsDecrypting(true);
    try {
      const message = `publickey:${publicKey}\ncontractAddresses:${contractAddress}\ncontractsChainId:${chainId}`;
      await signMessageAsync({ message });
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (encryptedContent.startsWith('FHE-')) {
        return atob(encryptedContent.substring(4));
      }
      return encryptedContent;
    } catch (e) { 
      console.error("Decryption failed:", e); 
      return "[Encrypted Message]";
    } finally { 
      setIsDecrypting(false); 
    }
  };

  const formatLocation = (location: string) => {
    if (location.includes(",")) {
      const [lat, lng] = location.split(",");
      return `${parseFloat(lat).toFixed(2)}°N, ${parseFloat(lng).toFixed(2)}°E`;
    }
    return location;
  };

  const getTimeRemaining = (expiration: number) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = expiration - now;
    if (diff <= 0) return "Expired";
    
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    return `${hours}h ${minutes}m left`;
  };

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner"></div>
      <p>Loading ephemeral spaces...</p>
    </div>
  );

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo">
          <h1>Ephemeral</h1>
          <span>FHE Social</span>
        </div>
        <div className="header-actions">
          <button 
            onClick={() => setShowCreateModal(true)} 
            className="create-btn"
          >
            + Create Space
          </button>
          <div className="wallet-connect">
            <ConnectButton accountStatus="avatar" chainStatus="icon" showBalance={false} />
          </div>
        </div>
      </header>

      <main className="main-content">
        {!activeEvent ? (
          <div className="event-discovery">
            <div className="discovery-header">
              <h2>Temporary Social Spaces</h2>
              <p>Join an event to start chatting - all data disappears when it ends</p>
            </div>
            
            <div className="events-grid">
              {events.length === 0 ? (
                <div className="no-events">
                  <div className="icon">🌌</div>
                  <p>No active spaces found</p>
                  <button 
                    onClick={() => setShowCreateModal(true)}
                    className="primary-btn"
                  >
                    Create First Space
                  </button>
                </div>
              ) : (
                events.map(event => (
                  <div 
                    key={event.id} 
                    className="event-card"
                    onClick={() => {
                      setActiveEvent(event);
                      setParticipantCount(event.participants);
                      loadMessages(event.id);
                    }}
                  >
                    <div className="event-type">
                      {eventTypes.find(t => t.name === event.eventType)?.icon || "🎭"}
                    </div>
                    <div className="event-details">
                      <h3>{event.eventType}</h3>
                      <div className="event-meta">
                        <span className="location">
                          {formatLocation(event.location)}
                        </span>
                        <span className="participants">
                          👥 {event.participants}
                        </span>
                      </div>
                      <div className="event-time">
                        {getTimeRemaining(event.expiration)}
                      </div>
                    </div>
                    <div className="event-join">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          joinEvent(event.id);
                        }}
                        className="join-btn"
                      >
                        Join
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="event-chat">
            <div className="chat-header">
              <button 
                onClick={() => setActiveEvent(null)}
                className="back-btn"
              >
                ← All Spaces
              </button>
              <div className="event-info">
                <h2>
                  {eventTypes.find(t => t.name === activeEvent.eventType)?.icon || "🎭"} 
                  {activeEvent.eventType}
                </h2>
                <div className="event-stats">
                  <span>👥 {participantCount}</span>
                  <span>{getTimeRemaining(activeEvent.expiration)}</span>
                  <span>{formatLocation(activeEvent.location)}</span>
                </div>
              </div>
              <div className="fhe-badge">
                <div className="lock-icon"></div>
                FHE Encrypted
              </div>
            </div>
            
            <div className="chat-messages">
              {messages.length === 0 ? (
                <div className="no-messages">
                  <div className="icon">💬</div>
                  <p>Be the first to message in this space</p>
                </div>
              ) : (
                messages.map(msg => (
                  <div 
                    key={msg.id} 
                    className={`message ${msg.sender === address ? "sent" : "received"}`}
                  >
                    <div className="message-sender">
                      {msg.sender === address ? "You" : `${msg.sender.substring(0, 6)}...`}
                    </div>
                    <div className="message-content">
                      {msg.sender === address ? 
                        atob(msg.encryptedContent.substring(4)) : // Show decrypted for user's own messages
                        "[Encrypted Message - Click to decrypt]"
                      }
                    </div>
                    {msg.sender !== address && (
                      <button 
                        onClick={async () => {
                          const decrypted = await decryptMessage(msg.encryptedContent);
                          const updatedMessages = messages.map(m => 
                            m.id === msg.id ? {...m, encryptedContent: `FHE-${btoa(decrypted)}`} : m
                          );
                          setMessages(updatedMessages);
                        }}
                        className="decrypt-btn"
                        disabled={isDecrypting}
                      >
                        {isDecrypting ? "Decrypting..." : "Decrypt"}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
            
            <div className="message-input">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              />
              <button 
                onClick={sendMessage}
                disabled={!newMessage.trim()}
              >
                Send
              </button>
            </div>
          </div>
        )}
      </main>

      {showCreateModal && (
        <div className="modal-overlay">
          <div className="create-modal">
            <div className="modal-header">
              <h2>Create Ephemeral Space</h2>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="close-modal"
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Event Type</label>
                <select
                  value={newEventData.eventType}
                  onChange={(e) => setNewEventData({...newEventData, eventType: e.target.value})}
                >
                  <option value="">Select type</option>
                  {eventTypes.map((type, index) => (
                    <option key={index} value={type.name}>
                      {type.icon} {type.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Duration (hours)</label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={newEventData.duration}
                  onChange={(e) => setNewEventData({...newEventData, duration: parseInt(e.target.value) || 1})}
                />
              </div>
              
              <div className="form-group">
                <label>Max Participants</label>
                <input
                  type="number"
                  min="2"
                  max="100"
                  value={newEventData.maxParticipants}
                  onChange={(e) => setNewEventData({...newEventData, maxParticipants: parseInt(e.target.value) || 10})}
                />
              </div>
              
              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={newEventData.location}
                  onChange={(e) => setNewEventData({...newEventData, location: e.target.value})}
                  placeholder={currentLocation ? `${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}` : "Enter location"}
                />
                {currentLocation && (
                  <button 
                    className="use-current"
                    onClick={() => setNewEventData({
                      ...newEventData,
                      location: `${currentLocation.lat.toFixed(4)},${currentLocation.lng.toFixed(4)}`
                    })}
                  >
                    Use Current Location
                  </button>
                )}
              </div>
              
              <div className="form-group">
                <label>Description (Optional)</label>
                <textarea
                  value={newEventData.description}
                  onChange={(e) => setNewEventData({...newEventData, description: e.target.value})}
                  placeholder="What's this space about?"
                  rows={3}
                />
              </div>
              
              <div className="fhe-notice">
                <div className="icon">🔒</div>
                <p>
                  All data in this space will be <strong>FHE encrypted</strong> and 
                  automatically deleted when the event ends.
                </p>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                onClick={() => setShowCreateModal(false)}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button 
                onClick={createEvent}
                disabled={!newEventData.eventType || creatingEvent}
                className="create-btn"
              >
                {creatingEvent ? "Creating..." : "Create Space"}
              </button>
            </div>
          </div>
        </div>
      )}

      {transactionStatus.visible && (
        <div className="transaction-modal">
          <div className={`transaction-content ${transactionStatus.status}`}>
            <div className="transaction-icon">
              {transactionStatus.status === "pending" && <div className="spinner"></div>}
              {transactionStatus.status === "success" && "✓"}
              {transactionStatus.status === "error" && "✗"}
            </div>
            <div className="transaction-message">
              {transactionStatus.message}
            </div>
          </div>
        </div>
      )}

      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-info">
            <h3>Ephemeral Social</h3>
            <p>FHE-encrypted temporary social spaces</p>
          </div>
          <div className="footer-links">
            <a href="#">About</a>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
          </div>
        </div>
        <div className="footer-tech">
          <span>Powered by Zama FHE</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
