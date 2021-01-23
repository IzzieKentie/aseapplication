const mysql=require('mysql2');
 const conn=mysql.createConnection({
   host:"asefypapplication.mysql.database.azure.com",
   user:"izziefyp@asefypapplication",
   password:"Password123",
   database: "ase_application"
 }).promise();
module.exports = conn;