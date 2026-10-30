// Zincir yapılandırması. Değerler .env.local'dan gelir (bkz. scripts/deploy.sh).
// Yalnızca biçimi doğrulanmış paket/nesne kimliklerine işlem gönderilir.

const HEX_ID = /^0x[0-9a-fA-F]{64}$/;

function readId(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return HEX_ID.test(trimmed) ? trimmed.toLowerCase() : null;
}

export type Network = "testnet" | "devnet" | "mainnet" | "localnet";

// Sui CLI yerel ortamı "local" diye adlandırır.
const rawNetwork = (process.env.NEXT_PUBLIC_SUI_NETWORK ?? "testnet").replace(/^local$/, "localnet");
export const NETWORK: Network = (["testnet", "devnet", "mainnet", "localnet"] as const).includes(
  rawNetwork as Network,
)
  ? (rawNetwork as Network)
  : "testnet";

export const GRPC_URLS: Record<Network, string> = {
  testnet: "https://fullnode.testnet.sui.io:443",
  devnet: "https://fullnode.devnet.sui.io:443",
  mainnet: "https://fullnode.mainnet.sui.io:443",
  localnet: "http://127.0.0.1:9000",
};

// Olay geçmişi GraphQL'den okunur: herkese açık gRPC düğümleri eski kayıtları budadığı için
// olay taraması orada hata verebiliyor. Yerel ağda GraphQL yok, gRPC kullanılır.
export const GRAPHQL_URLS: Partial<Record<Network, string>> = {
  testnet: "https://graphql.testnet.sui.io/graphql",
  devnet: "https://graphql.devnet.sui.io/graphql",
  mainnet: "https://graphql.mainnet.sui.io/graphql",
};

export const PACKAGE_ID =readId(process.env.NEXT_PUBLIC_PACKAGE_ID);
export const GARDEN_ID = readId(process.env.NEXT_PUBLIC_GARDEN_ID);

export const IS_CONFIGURED = PACKAGE_ID !== null && GARDEN_ID !== null;

export const MODULE = "garden";

export const EXPLORER_URL = `https://suiscan.xyz/${NETWORK}`;

export const MIST_PER_SUI = 1_000_000_000n;
