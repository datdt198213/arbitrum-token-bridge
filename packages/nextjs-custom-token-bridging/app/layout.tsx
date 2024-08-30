import "@rainbow-me/rainbowkit/styles.css";
import { Providers } from "./components/providers";
import { Deposit } from "./components/deposit";
import { Withdraw } from "./components/withdraw";
import { Claim } from "./components/claim";
import { Transfer } from "./components/transfer";

function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
          <Deposit />
          <Withdraw />
          <Claim />
          <Transfer />
        </Providers>
      </body>
    </html>
  );
}

export default RootLayout;
