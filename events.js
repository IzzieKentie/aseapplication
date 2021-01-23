var dbConfig = {
 server: "zavier-test.database.windows.net", // Use your SQL server name
 database: "AdventureWorks", // Database to connect to
 user: "<your username>", // Use your username
 password: "<your password>", // Use your password
 port: 1433,
 // Since we're on Windows Azure, we need to set the following options
 options: {
       encrypt: true
   }
};
