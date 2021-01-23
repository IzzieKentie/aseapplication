const http = require('http');
const fs = require('fs');
const express = require('express');
const path = require('path');
const cookieSession = require('cookie-session');
const bcrypt = require('bcryptjs');
const dbConnection = require('public/db.js');
const { body, validationResult } = require('express-validator');

const app = express();
app.use(express.urlencoded({extended:false}));

app.set('views', path.join(__dirname,'public'));
app.set('view engine','ejs');

const ifNotLoggedin = (req, res, next) => {
    if(!req.session.isLoggedIn){
        return res.render('login'');
    }
    next();
}

const ifLoggedin = (req,res,next) => {
    if(req.session.isLoggedIn){
        return res.redirect('home');
    }
    next();
}

app.get('/', ifNotLoggedin, (req,res,next) => {
    dbConnection.execute("SELECT `name` FROM `users` WHERE `id`=?",[req.session.userID])
    .then(([rows]) => {
        res.render('home',{
            name:rows[0].name
        });
    });
    
});

// LOGIN PAGE
app.post('/', ifLoggedin, [
    body('user').custom((value) => {
        return dbConnection.execute('SELECT `username` FROM `ase_team` WHERE `username`=?', [value])
        .then(([rows]) => {
            if(rows.length == 1){
                return true;
                
            }
            return Promise.reject('Invalid Username!');
            
        });
    }),
    body('pass','Password is empty!').trim().not().isEmpty(),
], (req, res) => {
    const validation_result = validationResult(req);
    const {pass, user} = req.body;
    if(validation_result.isEmpty()){
        
        dbConnection.execute("SELECT * FROM `ase_team` WHERE `user`=?",[user])
        .then(([rows]) => {
            bcrypt.compare(pass, rows[0].password).then(compare_result => {
                if(compare_result === true){
                    req.session.isLoggedIn = true;
                    req.session.userID = rows[0].id;

                    res.redirect('home');
                }
                else{
                    res.render('login',{
                        login_errors:['Invalid Password!']
                    });
                }
            })
            .catch(err => {
                if (err) throw err;
            });


        }).catch(err => {
            if (err) throw err;
        });
    }
    else{
        let allErrors = validation_result.errors.map((error) => {
            return error.msg;
        });
        // REDERING login-register PAGE WITH LOGIN VALIDATION ERRORS
        res.render('public/login.ejs',{
            login_errors:allErrors
        });
    }
});
// END OF LOGIN PAGE


/*const server = http.createServer((request, response) => {
    response.writeHead(200, {"Content-Type": "text/html"});
    fs.readFile('public/home.ejs', null, function (error, data) {
      if (error) {
          response.writeHead(404);
          respone.write('Whoops! File not found!');
      } else {
          response.write(data);
      }
      response.end();
  });
});*/

const port = process.env.PORT || 1337;
server.listen(port);
console.log("Server running at http://localhost:%d", port); 