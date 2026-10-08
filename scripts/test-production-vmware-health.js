'use strict';

const http = require('http');
const express = require('express');
const router = require('../server/enterprise-lab/twins-router');

let pass = 0;
let fail = 0;

const ok = (condition, message) => {
  condition ? pass++ : (fail++, console.log('FAIL', message));
};

const app = express();
app.use('/api/twins', router);

const server = app.listen(0, () => {
  const port = server.address().port;

  http.get({ port, path: '/api/twins/vmware/health' }, (res) => {
    let body = '';

    res.on('data', (chunk) => {
      body += chunk;
    });

    res.on('end', () => {
      try {
        const data = JSON.parse(body);

        ok(res.statusCode === 200, 'health endpoint returns 200');
        ok(data.ok === true, 'health response is ok');
        ok(data.source === 'digital-twin', 'health source is digital-twin');
        ok(data.vcenter?.status === 'Healthy', 'baseline vCenter status is Healthy');
        ok(
          data.vcenter?.hosts?.connected === data.vcenter?.hosts?.total,
          'all baseline hosts are connected'
        );
        ok(
          data.vcenter?.hosts?.total === 3,
          'baseline host count is 3'
        );
        ok(
          data.vcenter?.vms?.running === data.vcenter?.vms?.total,
          'all baseline VMs are running'
        );
        ok(
          data.vcenter?.vms?.total === 5,
          'baseline VM count is 5'
        );
        ok(
          data.vcenter?.storage?.usedPct === 39,
          'baseline storage utilization is 39%'
        );
        ok(data.vcenter?.cpuPct === 29, 'baseline CPU is 29%');
        ok(data.vcenter?.memPct === 44, 'baseline memory is 44%');
        ok(data.vra?.status === 'Not modeled', 'vRA is explicitly not modeled');

        console.log(`${pass} passed, ${fail} failed`);
        server.close(() => process.exit(fail ? 1 : 0));
      } catch (err) {
        console.log('FAIL exception:', err.message);
        server.close(() => process.exit(1));
      }
    });
  }).on('error', (err) => {
    console.log('FAIL request:', err.message);
    server.close(() => process.exit(1));
  });
});
