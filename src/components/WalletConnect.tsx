
import { useWeb3 } from "@/context/Web3Context";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";

export function WalletConnect() {
  const { account, isConnecting, connectWallet } = useWeb3();

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div>
      {!account ? (
        <Button 
          onClick={connectWallet} 
          disabled={isConnecting}
          className="flex items-center gap-2"
        >
          <Wallet className="h-4 w-4" />
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </Button>
      ) : (
        <Button variant="outline" className="font-mono">
          {formatAddress(account)}
        </Button>
      )}
    </div>
  );
}
