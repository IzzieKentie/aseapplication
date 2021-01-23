const mysql=require('mysql2');
 const conn=mysql.createConnection({
   host:"asefypapplication.mysql.database.azure.com",
   user:"izziefyp@asefypapplication",
   password:"012414@Kent"
 });

conn.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
});