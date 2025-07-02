# Account Swap Plugin - Project Structure

This Vendetta plugin allows users to securely swap Discord accounts or share account access through a sophisticated protocol system.

## 📁 Project Structure

```
src/
├── index.ts                    # Main plugin entry point
├── types.ts                    # TypeScript type definitions
├── swap.ts                     # Message encoding/decoding protocol
├── 3y3.ts                      # Base encoding utilities
├── commands/                   # Command definitions
│   ├── index.ts               # Command aggregator
│   ├── swap.ts                # Main swap command
│   ├── whitelist.ts           # Whitelist management commands
│   ├── possession.ts          # Possession commands
│   └── settings.ts            # Settings commands (accept-everyone)
├── patches/                    # Event handlers and protocol logic
│   └── message.ts             # Message protocol handler
├── core/                      # Core business logic
│   └── operations.ts          # Swap and possession operations
└── utils/                     # Utility functions
    ├── cleanup.ts             # State management and cleanup
    └── ui.ts                  # UI helper functions
```

## 🔧 Architecture Overview

### **Main Components**

#### **1. Entry Point (`index.ts`)**
- Initializes plugin storage
- Registers message patches and commands
- Handles plugin lifecycle (load/unload)

#### **2. Commands (`commands/`)**
- **`swap.ts`**: Core account swapping functionality
- **`whitelist.ts`**: User whitelist management
- **`possession.ts`**: One-way account possession
- **`settings.ts`**: Dangerous auto-accept settings

#### **3. Protocol Handler (`patches/message.ts`)**
- Intercepts Discord messages
- Handles swap/possession protocol messages
- Manages protocol state transitions

#### **4. Core Operations (`core/operations.ts`)**
- **`performPossession()`**: Handles account possession logic
- **`finalizeSwap()`**: Handles account swapping logic
- Token validation and switching
- Message cleanup

#### **5. Utilities (`utils/`)**
- **`cleanup.ts`**: State management, timeout handling
- **`ui.ts`**: User interface helpers (confirmations, DM validation)

## 🔄 Protocol Flow

### **Account Swapping (Mutual Exchange)**
```
Initiator                    Receiver
    |                           |
    |------- SWAP_REQUEST ----->|
    |                           |
    |<----- SWAP_RESPONSE ------|  (with receiver's token)
    |                           |
    |------ SWAP_FINALIZE ----->|  (with initiator's token)
    |                           |
  [Switch]                  [Switch]
```

### **Account Possession (One-way Access)**

**Invitation Flow:**
```
Inviter                     Invitee
    |                          |
    |------ POSSESS_INVITE ---->|  (with inviter's token)
    |                          |
    |                      [Switch]
```

**Request Flow:**
```
Requester                   Target
    |                          |
    |----- POSSESS_REQUEST ---->|
    |                          |
    |<---- POSSESS_ACCEPT ------|  (with target's token)
    |                          |
  [Switch]                     |
```

## 🛡️ Security Features

### **Multi-layer Confirmation System**
- Double confirmation for dangerous operations
- Clear warning messages about risks
- Whitelist system for trusted users

### **Message Security**
- Automatic message cleanup to hide tokens
- Encoded message content using 3y3 protocol
- DM-only operation requirement

### **Error Handling**
- Comprehensive try-catch blocks
- User-friendly error messages via bot notifications
- Graceful degradation on partial failures

### **State Management**
- Timeout handling (30s for requests)
- Automatic cleanup on plugin unload
- Duplicate request prevention

## 📋 Available Commands

### **Core Commands**
- `/swap` - Initiate account swap

### **Whitelist Management**
- `/swap-whitelist-add` - Add user to whitelist
- `/swap-whitelist-remove` - Remove user from whitelist
- `/swap-whitelist-list` - List whitelisted users
- `/swap-whitelist-clear` - Clear whitelist

### **Possession Commands**
- `/possess-invite` - Invite someone to possess your account
- `/possess-request` - Request to possess someone's account

### **Settings Commands**
- `/swap-accept-everyone-enable` - ⚠️ Auto-accept all requests
- `/swap-accept-everyone-disable` - Disable auto-accept
- `/swap-accept-everyone-status` - Check auto-accept status

## 🔧 Development Guidelines

### **Adding New Commands**
1. Create command function in appropriate file under `commands/`
2. Add to the export list in `commands/index.ts`
3. Commands automatically registered on plugin load

### **Extending Protocol**
1. Add new message types to `swap.ts` 
2. Handle new message types in `patches/message.ts`
3. Add corresponding business logic to `core/operations.ts`

### **Error Handling Pattern**
```typescript
try {
    // Operation logic
} catch (err) {
    console.error("Error context:", err);
    sendBotMessage(channelId, `❌ **Operation Failed**: ${err.message || 'Unknown error'}.`);
    // Cleanup if needed
}
```

## ⚠️ Safety Considerations

### **For Users**
- Only use with completely trusted individuals
- Understand that tokens provide full account access
- Use whitelist for frequently trusted users
- Be extremely careful with auto-accept settings

### **For Developers**
- Always validate tokens before use
- Implement proper cleanup on all code paths
- Use clear, descriptive error messages
- Test timeout and error scenarios thoroughly

## 🧪 Testing

### **Manual Testing Checklist**
- [ ] Basic swap between two accounts
- [ ] Timeout handling (wait 30+ seconds)
- [ ] Error scenarios (invalid tokens, network issues)
- [ ] Whitelist functionality
- [ ] Possession invite/request flows
- [ ] Message cleanup verification
- [ ] Plugin load/unload cleanup

### **Error Scenarios to Test**
- Network failures during message sending
- Invalid or corrupted tokens
- Discord API changes/failures
- Rapid command execution
- Plugin reload during active operations

This modular structure makes the codebase much more maintainable, testable, and extensible while preserving all the security and functionality features.
