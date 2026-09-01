#!/usr/bin/env node
/**
 * Test script for AutoTrace Node.js SDK (autotrace-node)
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 * Triggers a simulated TypeError, sends it to the AutoTrace backend,
 * and verifies a 201 Created response.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const nodeSdkDir = fs.existsSync(path.join(__dirname, 'node'))
  ? path.join(__dirname, 'node')
  : path.join(__dirname, 'sdk', 'node');
const autotrace = require(nodeSdkDir);


const API_KEY = process.env.AUTOTRACE_API_KEY || 'autotrace_pk_0d14558fe6e003bc9ff3aa70ac373785ea4163bd';
const ENDPOINT = process.env.AUTOTRACE_ENDPOINT || 'https://autotrace-backend.onrender.com/api/ingest/';

async function main() {
  console.log('==================================================');
  console.log('       AutoTrace Node.js SDK Verification Test    ');
  console.log('==================================================');

  // 1. Initialize AutoTrace client
  console.log(`[1] Initializing AutoTrace Node.js SDK with key '${API_KEY.slice(0, 20)}...'`);
  autotrace.init({
    apiKey: API_KEY,
    endpointUrl: ENDPOINT,
    environment: 'test-suite',
    context: { service: 'auth-service', framework: 'express' },
  });

  // 2. Trigger TypeError
  console.log('[2] Triggering TypeError...');
  try {
    const userSession = null;
    // Will throw: TypeError: Cannot read properties of null (reading 'getPermissions')
    userSession.getPermissions();
  } catch (error) {
    console.log(`    Caught expected error: ${error.name}: ${error.message}`);

    // 3. Dispatch exception to backend
    console.log(`[3] Dispatching error event to ${ENDPOINT}...`);
    const result = await autotrace.captureException(error, {
      endpoint: '/api/v1/auth/verify-token',
      userId: 'usr_abc123',
      action: 'LOGIN_ATTEMPT',
    });

    if (result) {
      console.log(`[4] Received response: HTTP ${result.status}`);
      console.log('    Payload:', JSON.stringify(result.data, null, 2));

      if (result.status === 201) {
        console.log('\n>>> SUCCESS: Node.js SDK successfully reported exception (HTTP 201 Created)! <<<\n');
        process.exit(0);
      } else {
        console.error(`\n>>> FAILURE: Expected HTTP 201, got ${result.status} <<<\n`);
        process.exit(1);
      }
    } else {
      console.error('\n>>> FAILURE: No response received <<<\n');
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
