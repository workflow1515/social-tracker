module.exports = {
  apps: [{
    name: 'social',
    script: '.next/standalone/server.js',
    cwd: '/var/www/social',
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '512M',
    env: { NODE_ENV: 'production', PORT: 3001 }
  }]
}
