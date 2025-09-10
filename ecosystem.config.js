module.exports = {
  apps : [{
    name   : "invoice-backend",
    script : "./invoice-backend/server.js",
    watch: true,
    ignore_watch : ["node_modules", "frontend"],
  }]
}