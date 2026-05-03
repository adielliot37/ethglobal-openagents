"use client";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import type { Address } from "viem";
import { willAbi } from "@/lib/abi";
import { Button } from "./Button";
import { useToast } from "./Toast";
import type { WillStateName } from "@/lib/config";

type Method = "heartbeat" | "cancel" | "triggerWill" | "execute";

export function WillActions({
  address,
  state,
  isOwner,
  triggerReady,
  executeReady,
  onSuccess,
}: {
  address: Address;
  state: WillStateName;
  isOwner: boolean;
  triggerReady: boolean;
  executeReady: boolean;
  onSuccess?: () => void;
}) {
  const { isConnected } = useAccount();
  const { push } = useToast();
  const { writeContract, data: hash, isPending, reset } = useWriteContract();
  const { isLoading: mining, isSuccess } = useWaitForTransactionReceipt({ hash });

  if (isSuccess && onSuccess) {
    onSuccess();
    reset();
  }

  function fire(method: Method, label: string) {
    if (!isConnected) {
      push("connect a wallet first", "error");
      return;
    }
    writeContract(
      { address, abi: willAbi, functionName: method },
      {
        onSuccess: () => push(`${label} sent`, "info"),
        onError: (err) => push(`${label} failed: ${(err as { shortMessage?: string }).shortMessage ?? err.message}`, "error"),
      },
    );
  }

  const terminal = state === "Executed" || state === "Cancelled";

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Button
        onClick={() => fire("heartbeat", "heartbeat")}
        disabled={!isOwner || terminal}
        loading={isPending || mining}
      >
        ping heartbeat
      </Button>
      <Button
        variant="secondary"
        onClick={() => fire("cancel", "cancel")}
        disabled={!isOwner || state !== "Triggered"}
      >
        cancel trigger
      </Button>
      <Button
        variant="secondary"
        onClick={() => fire("triggerWill", "trigger")}
        disabled={!triggerReady || state !== "Active"}
      >
        force-trigger
      </Button>
      <Button
        variant="danger"
        onClick={() => fire("execute", "execute")}
        disabled={!executeReady || state !== "Triggered"}
      >
        execute
      </Button>
    </div>
  );
}
