import {
  rpc,
  xdr,
  Address,
  Account,
  Contract,
  TransactionBuilder,
  Networks,
  scValToNative,
  nativeToScVal,
} from "@stellar/stellar-sdk";

// Loaded from environment variables, populated by deploy.sh or manual config
export const SOROBAN_RPC_URL = import.meta.env.VITE_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
export const ESCROW_CONTRACT_ID = import.meta.env.VITE_ESCROW_CONTRACT_ID || "";
export const REPUTATION_CONTRACT_ID = import.meta.env.VITE_REPUTATION_CONTRACT_ID || "";

export const NETWORK_PASSPHRASE = Networks.TESTNET;

export const rpcServer = new rpc.Server(SOROBAN_RPC_URL);

/**
 * Helper to fetch a transaction's status by polling the RPC server.
 */
export async function pollTransactionStatus(txHash: string): Promise<rpc.Api.GetTransactionResponse> {
  const maxAttempts = 12;
  const delayMs = 2000;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await rpcServer.getTransaction(txHash);
    if (response.status !== "NOT_FOUND") {
      if (response.status === "SUCCESS") {
        return response;
      }
      if (response.status === "FAILED") {
        throw new Error("Transaction execution failed on-chain.");
      }
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error("Transaction polling timed out.");
}

/**
 * Base method to build, simulate, and request user signature for a Soroban call,
 * then submit it and wait for confirmation.
 */
export async function callContractMethod(
  walletAddress: string,
  contractId: string,
  methodName: string,
  args: xdr.ScVal[],
  signCallback: (xdr: string, passphrase: string) => Promise<string>
): Promise<rpc.Api.GetTransactionResponse> {
  // 1. Get sender account details from network
  const sourceAccount = await rpcServer.getAccount(walletAddress);
  
  // 2. Build the initial transaction
  const contract = new Contract(contractId);
  const tx = new TransactionBuilder(sourceAccount, {
    fee: "1000", // Placeholder base fee
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(methodName, ...args)
    )
    .setTimeout(30)
    .build();

  // 3. Simulate the transaction to determine fees/resources
  const simResponse = await rpcServer.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simResponse)) {
    throw new Error(`Simulation failed: ${simResponse.error}`);
  }

  // 4. Assemble the transaction with simulation results
  const assembledTx = rpc.assembleTransaction(tx, simResponse);

  // 5. request wallet to sign
  const signedTxXdr = await signCallback(assembledTx.build().toXDR(), NETWORK_PASSPHRASE);
  
  // 6. Submit the signed transaction XDR
  const sendResponse = await rpcServer.sendTransaction(
    TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE) as any
  );
  if (sendResponse.status === "ERROR") {
    const errorXdr = sendResponse.errorResult ? sendResponse.errorResult.toXDR("base64") : "unknown";
    throw new Error(`Submission failed: ${errorXdr}`);
  }

  // 7. Poll for confirmation
  return await pollTransactionStatus(sendResponse.hash);
}

/**
 * Fetch a job from the escrow contract.
 */
export async function getJobDetails(jobId: number): Promise<any> {
  const contract = new Contract(ESCROW_CONTRACT_ID);
  
  // Build a dummy transaction just for simulation (read-only call)
  const account = new Account("GB44L2MSU7YC7WQRJKMOGXZYNZKJFABB3YHSW7TF7JGJO74EDOVN6ZIR", "0");
  
  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call("get_job", nativeToScVal(jobId, { type: "u64" }))
    )
    .setTimeout(10)
    .build();

  const response = await rpcServer.simulateTransaction(tx);
  if (rpc.Api.isSimulationSuccess(response) && response.result) {
    // Parse result
    return parseJob(scValToNative(response.result.retval));
  }
  throw new Error("Job not found.");
}

/**
 * Fetch a freelancer's reputation.
 */
export async function getReputationDetails(freelancerAddress: string): Promise<{ total_score: number; rating_count: number }> {
  const contract = new Contract(REPUTATION_CONTRACT_ID);
  const account = new Account("GB44L2MSU7YC7WQRJKMOGXZYNZKJFABB3YHSW7TF7JGJO74EDOVN6ZIR", "0");
  
  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call("get_reputation", new Address(freelancerAddress).toScVal())
    )
    .setTimeout(10)
    .build();

  const response = await rpcServer.simulateTransaction(tx);
  if (rpc.Api.isSimulationSuccess(response) && response.result) {
    const rawVal = scValToNative(response.result.retval);
    return {
      total_score: Number(rawVal.total_score || 0),
      rating_count: Number(rawVal.rating_count || 0),
    };
  }
  return { total_score: 0, rating_count: 0 };
}

function parseJob(raw: any): any {
  return {
    client: raw.client,
    freelancer: raw.freelancer,
    token: raw.token,
    amount: raw.amount.toString(),
    description: raw.description.toString(),
    deadline: Number(raw.deadline),
    // Status is represented as the enum name/variant in JS native representation
    status: typeof raw.status === "string" ? raw.status : Object.keys(raw.status)[0],
    rated: !!raw.rated,
  };
}
