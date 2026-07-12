module.exports = {
  apps : [
    {
      name   : "invoice-backend",
      script : "./server.js",
      cwd    : "./invoice-backend",
      watch  : true,
      ignore_watch : ["node_modules", "../frontend"],
    },
    {
      name   : "invoice-frontend",
      script : "./node_modules/vite/bin/vite.js",
      args   : "preview --host",
      cwd    : "./frontend",
      watch  : false
    }
  ]
}