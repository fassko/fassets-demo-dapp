import { execSync } from 'child_process';
import { resolve } from 'path';

async function generateTypes() {
  try {
    console.log('Generating TypeScript types from OpenZeppelin contracts...');
    
    // Create output directory
    const outputDir = resolve(__dirname, '../src/types/contracts');
    
    // Generate types from OpenZeppelin contracts
    const command = `npx typechain --target ethers-v6 --out-dir ${outputDir} node_modules/@openzeppelin/contracts/build/contracts/*.json`;
    
    execSync(command, { stdio: 'inherit' });
    
    console.log('✅ TypeScript types generated successfully!');
    console.log(`📁 Types saved to: ${outputDir}`);
    
  } catch (error) {
    console.error('❌ Error generating types:', error);
    process.exit(1);
  }
}

generateTypes(); 