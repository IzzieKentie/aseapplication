const mysql=require('mysql');
 const conn=mysql.createConnection({
   host:'asefypapplication.mysql.database.azure.com',
   user:'izziefyp',
   password:'012414@Kent',
   database:'ase_application'
 });
conn.connect(function(error){
   if(!!error){
     console.log(error);
   }else{
     console.log('Connected!:)');
   }
 });  
module.exports = connection; 