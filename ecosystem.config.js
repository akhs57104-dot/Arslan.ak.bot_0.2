module.exports = {
  apps: [
    {
      name: "tech-arslan-software-solutions",
      script: "index.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      restart_delay: 5000,
      max_restarts: 20,
      env: {
        NODE_ENV: "production",
        // Optional: override any config.js value here or in config.env
        // PREFIX: ".",
        // BOT_NAME: "TECH ARSLAN SOFTWARE SOLUTIONS"
      },
      error_file: "./logs/error.log",
      out_file: "./logs/out.log",
      merge_logs: true,
      time: true,
      kill_timeout: 8000,
    },
  ],
};
