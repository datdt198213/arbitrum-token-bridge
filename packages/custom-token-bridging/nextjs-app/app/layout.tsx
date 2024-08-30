import "@rainbow-me/rainbowkit/styles.css";
import { Providers } from "./providers";
import { Deposit } from "./deposit";
import { Withdraw } from "./withdraw";

function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
          <Deposit />
          <Withdraw />
        </Providers>
      </body>
    </html>
  );
}

export default RootLayout;
