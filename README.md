# Ephemeral Social FHE: A DeSoc Protocol for Creating FHE-Encrypted Social Spaces

Ephemeral Social FHE is a revolutionary protocol designed to allow users to create temporary, Fully Homomorphic Encryption (FHE)-encrypted social networks centered around specific events, such as concerts or meetings. Powered by **Zama's Fully Homomorphic Encryption technology**, this project ensures that all user data remains private, secure, and is automatically destroyed after the event concludes. With a seamless and burden-free “in-the-moment” social experience, Ephemeral Social FHE redefines how we connect digitally.

## The Problem We Solve

In an era of digital interactions, users are increasingly concerned about their privacy and the permanence of their digital identities. Social media platforms often retain user data indefinitely, leading to potential misuses and unwanted exposure of personal information. Although there are existing social networks, they typically do not provide users the ability to control their data after an event has passed, leaving many yearning for a more ephemeral solution that respects their privacy.

## The FHE Solution

Ephemeral Social FHE addresses these privacy concerns by enabling the creation of temporary social spaces that leverage **Zama's state-of-the-art Fully Homomorphic Encryption**. By utilizing libraries such as **Concrete** and **TFHE-rs**, this innovative protocol ensures end-to-end encryption of all data exchanged within the social network. Once the event is over, the infrastructure automatically wipes all user-generated content, leaving no trace behind. This approach not only alleviates concerns surrounding digital identity permanence but also fosters a more authentic and present social interaction experience.

## Key Features

- **Ephemeral Social Networks**: Create networks that arise and dissolve with specific events.
- **End-to-End FHE Encryption**: All user communications are encrypted, ensuring maximum privacy.
- **Automatic Data Destruction**: User data is automatically erased after an event concludes, promoting a clean slate.
- **Event-Driven Engagement**: Designed for discussions surrounding specific events like concerts, meetings, and more.
- **Location-Based Chatrooms**: Users can create chatrooms based on geographic locations or specific events for more targeted interaction.

## Technology Stack

- **Zama's SDK**: Utilizing Zama's open-source libraries like **Concrete** and **TFHE-rs** for all encryption processes.
- **Node.js**: For building and testing.
- **Hardhat / Foundry**: Utilized for contract deployment and blockchain interactions.
- **Solidity**: The programming language for writing smart contracts.

## Directory Structure

```plaintext
Ephemeral_Social_Fhe/
│
├── contracts/
│   └── Ephemeral_Social_Fhe.sol
├── scripts/
│   ├── deploy.js
│   └── interact.js
├── test/
│   ├── network.test.js
│   └── event.test.js
└── package.json
```

## Installation Guide

To set up the Ephemeral Social FHE project on your local machine, follow these steps:

1. Ensure you have **Node.js** installed (version 14 or higher recommended).
2. Install the required development tools:
   - **Hardhat** or **Foundry** for handling smart contracts.
3. Download this project and navigate to its directory.
4. Run the following command to install necessary dependencies, including Zama FHE libraries:
   ```bash
   npm install
   ```

Please **do not** use `git clone` or any URLs to download this project.

## Build & Run Guide

Once the installation is complete, you can build and run the project with the following commands:

1. **Compile the smart contracts**:
   ```bash
   npx hardhat compile
   ```

2. **Run tests to ensure everything works properly**:
   ```bash
   npx hardhat test
   ```

3. **Deploy your contracts** (make sure you are connected to a network, for example, a local Hardhat network):
   ```bash
   npx hardhat run scripts/deploy.js
   ```

4. **Interact with the deployed contract**:
   You can use the provided `interact.js` script to send messages or create chatrooms:
   ```bash
   npx hardhat run scripts/interact.js
   ```

## Example Code

Here is a simple example demonstrating the creation of an ephemeral chatroom:

```javascript
const { ethers } = require("hardhat");

async function main() {
    const EphemeralSocialFHE = await ethers.getContractFactory("Ephemeral_Social_Fhe");
    const chatroom = await EphemeralSocialFHE.deploy();

    console.log("Chatroom deployed to:", chatroom.address);

    // Create a new chatroom for the event
    const eventName = "Concert Night!";
    const location = "Central Park";
    await chatroom.createChatroom(eventName, location);

    console.log(`Chatroom created for ${eventName} at ${location}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
```

In this code snippet, we deploy the Ephemeral Social FHE contract and create a new chatroom associated with an event, ensuring that the chatroom is both ephemeral and securely encrypted.

## Acknowledgements

### Powered by Zama

A special thanks to the Zama team for their pioneering work in the realm of Fully Homomorphic Encryption and for providing the open-source tools that make applications like Ephemeral Social FHE possible. Your commitment to privacy-centric technology shapes the future of secure communications.

Join us on this incredible journey towards a safer and more private digital interaction landscape!
