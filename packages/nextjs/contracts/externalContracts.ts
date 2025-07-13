import { GenericContractsDeclaration } from "~~/utils/scaffold-eth/contract";

const externalContracts = {
  11155111: {
    SwapVerifier: {
      address: "0x9f8F02DAB384DDdf1591C3366069Da3Fb0018220",
      abi: [
        {
          "inputs": [
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "name": "authors",
          "outputs": [
            {
              "internalType": "string",
              "name": "",
              "type": "string"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "swapContract",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "tokenA",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "tokenB",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "amountA",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "amountB",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "amountIn",
              "type": "uint256"
            },
            {
              "internalType": "string",
              "name": "author",
              "type": "string"
            }
          ],
          "name": "verify",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        }
      ],
    },
  },
} as const;

export default externalContracts satisfies GenericContractsDeclaration;
