# CrowdFund - Solana Crowdfunding Platform

A decentralized crowdfunding platform built on Solana blockchain using Next.js 14, TypeScript, and shadcn/ui.

## Features

- **Decentralized**: Built on Solana blockchain for transparency and security
- **Modern UI**: Beautiful interface using shadcn/ui components
- **Wallet Integration**: Support for multiple Solana wallets (Phantom, Solflare, etc.)
- **Fast & Low Cost**: Leverage Solana's high-speed, low-fee network
- **TypeScript**: Full type safety throughout the application

## Tech Stack

- **Frontend**: Next.js 14, React 19, TypeScript
- **Blockchain**: Solana, @solana/web3.js, @coral-xyz/anchor
- **Styling**: Tailwind CSS, shadcn/ui
- **Wallet**: Solana Wallet Adapter
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Charts**: Recharts

## Project Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── wallet/          # Wallet connection components
│   ├── campaign/        # Campaign-related components
│   └── layout/          # Layout components (navbar, footer)
├── lib/
│   ├── solana/          # Solana configuration and utilities
│   ├── utils.ts         # General utilities
│   └── types.ts         # TypeScript type definitions
├── hooks/               # Custom React hooks
├── app/                 # Next.js app directory
└── public/              # Static assets
```

## Getting Started

1. **Install dependencies**:
```bash
npm install
```

2. **Run the development server**:
```bash
npm run dev
```

3. **Open your browser**:
Navigate to [http://localhost:3000](http://localhost:3000)

## Wallet Setup

To interact with the platform, you'll need a Solana wallet:

1. Install [Phantom Wallet](https://phantom.app/) or [Solflare](https://solflare.com/)
2. Switch to Devnet for testing
3. Get some test SOL from a [Solana faucet](https://faucet.solana.com/)

## Development

The project is set up with:
- **ESLint** for code linting
- **TypeScript** for type checking
- **Tailwind CSS** for styling
- **shadcn/ui** for UI components

## Smart Contract Integration

The platform is designed to work with a Solana smart contract (program). The IDL (Interface Description Language) is defined in `lib/solana/idl.ts`. 

To integrate with your deployed program:
1. Update `CROWDFUNDING_PROGRAM_ID` in `lib/solana/config.ts`
2. Deploy your Solana program and update the program ID
3. Implement the actual blockchain interactions in the hooks

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details.
