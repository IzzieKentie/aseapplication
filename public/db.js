var mysql=require('mysql');
 var connection=mysql.createConnection({
   host:'asefypapplication.mysql.database.azure.com',
   user:'izziefyp',
   password:'012414@Kent',
   database:'ase_application'
 });
connection.connect(function(error){
   if(!!error){
     console.log(error);
   }else{
     console.log('Connected!:)');
   }
 });  
module.exports = connection; 