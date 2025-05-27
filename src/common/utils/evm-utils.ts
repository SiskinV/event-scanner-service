import { ethers } from 'ethers';

export function isValidEthereumAddress(address: string): boolean {
  return address.startsWith('0x') && ethers.utils.isAddress(address);
}
