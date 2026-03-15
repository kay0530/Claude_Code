const { spawn } = require('child_process');
const port = process.env.PORT || 5173;
const child = spawn('npx.cmd', ['vite', '--host', '--port', String(port)], {
  stdio: 'inherit',
  cwd: 'C:\\tmp_fc',
  shell: true
});
child.on('error', (err) => { console.error(err); process.exit(1); });
child.on('exit', (code) => { process.exit(code || 0); });
