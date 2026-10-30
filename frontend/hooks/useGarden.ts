"use client";

import { useCurrentAccount, useCurrentClient } from "@mysten/dapp-kit-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SuiGraphQLClient } from "@mysten/sui/graphql";
import { GRAPHQL_URLS, IS_CONFIGURED, NETWORK } from "@/lib/config";
import { fetchGarden, fetchLeaderboard, fetchRecentEvents, fetchUserState } from "@/lib/garden";

const LIVE_MS = 5_000;

export function useGarden() {
  const client = useCurrentClient();
  return useQuery({
    queryKey: ["garden"],
    queryFn: () => fetchGarden(client),
    enabled: IS_CONFIGURED,
    refetchInterval: LIVE_MS,
  });
}

export function useUserState() {
  const client = useCurrentClient();
  const account = useCurrentAccount();
  const address = account?.address;
  return useQuery({
    queryKey: ["user", address],
    queryFn: () => fetchUserState(client, address!),
    enabled: IS_CONFIGURED && !!address,
    refetchInterval: LIVE_MS,
  });
}

export function useLeaderboard(participants: string[] | undefined) {
  const client = useCurrentClient();
  return useQuery({
    queryKey: ["leaderboard", participants?.length ?? 0],
    queryFn: () => fetchLeaderboard(client, participants ?? []),
    enabled: IS_CONFIGURED && !!participants,
    refetchInterval: LIVE_MS * 2,
  });
}

const graphqlUrl = GRAPHQL_URLS[NETWORK];
const eventsClient = graphqlUrl ? new SuiGraphQLClient({ network: NETWORK, url: graphqlUrl }) : null;

export function useRecentEvents() {
  const client = useCurrentClient();
  return useQuery({
    queryKey: ["events"],
    queryFn: () => fetchRecentEvents(eventsClient ?? client),
    enabled: IS_CONFIGURED,
    refetchInterval: LIVE_MS * 2,
  });
}

/** Saniyede bir güncellenen saat (geri sayımlar için). */
export function useNow(intervalMs = 1_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
