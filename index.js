const http = require('http');
const fs = require('fs');
const conn = require('./db');
const express = require('express');
const path = require('path');
const cookieSession = require('cookie-session');
const { body, validationResult } = require('express-validator');

const app = express();
app.use(express.urlencoded({extended:false}));

app.set('views', path.join(__dirname,'public'));
app.set('view engine','ejs');

app.use(cookieSession({
    name: 'session',
    keys: ['key1', 'key2'],
    maxAge:  3600 * 1000 // 1hr
}));

const ifNotLoggedin = (req, res, next) => {
    if(!req.session.isLoggedIn){
        return res.render('login');
    }
   next();
}

const ifLoggedin = (req,res,next) => {
    if(req.session.isLoggedIn){
        return res.render('home');
    }
   next();
}

app.get('/logout',(req,res)=>{
    req.session = null;
    res.render('login');
});

app.get('/', ifNotLoggedin, (req,res,next) => {
    conn.execute("SELECT `username` FROM `ase_team` WHERE `ID`=?",[req.session.userID]).then(([rows]) => {
        res.render('home',{
            name:rows[0].name
        });

    }).catch(e => { console.log(e) });
});

app.post('/', ifLoggedin, [
    body('user').custom((value) => {
        return conn.execute('SELECT `username` FROM `ase_team` WHERE `username`=?', [value]).then(([rows]) => {
            if(rows.length == 1){
                return true;
            }
           return Promise.reject('Invalid Username');
            
        })
    }),
    body('pass','Password is empty!').trim().not().isEmpty(),
], (req, res) => {
    const validation_result = validationResult(req);
    const {pass, user} = req.body;
    if(validation_result.isEmpty()){
        conn.execute("SELECT * FROM `ase_team` WHERE `username`=?",[user]).then(([rows]) => {
                if(pass.toString().trim() === rows[0].password.toString().trim()){
                    req.session.isLoggedIn = true;
                    req.session.userID = rows[0].ID;
                    req.session.role = rows[0].role; 
                    res.render('home');
                }
                else{
                    res.render('login',{
                    login_errors:['Invalid Password!']
                    });
                }
        }).catch(err => {
            if (err) throw err;
        });
    }
    else{
        let allErrors = validation_result.errors.map((error) => {
            return error.msg;
        });
        // REDERING login-register PAGE WITH LOGIN VALIDATION ERRORS
        res.render('login',{
            login_errors:allErrors
        });
    }
});

app.get('/PastEvents',(req,res)=>{
      conn.execute("SELECT * FROM ASE_EVENTS WHERE EVENT_ID IN (SELECT EVENT_ID FROM EVENT_ASSIGNED WHERE MEMBER_ID=?) AND EVENT_STATUS=?",[req.session.userID, "Past"],).then(([rows]) => {
        res.render('PastEvents',{
            data:rows
        });
    }).catch(e => { console.log(e) });
});

app.get('/CurrentEvent',(req,res)=>{
        conn.execute("SELECT * FROM ASE_EVENTS WHERE EVENT_ID IN (SELECT EVENT_ID FROM EVENT_ASSIGNED WHERE MEMBER_ID=?) AND EVENT_STATUS=?",[req.session.userID, "Current"],).then(([rows]) => {
        if(req.session.role === "Co-Designer") {
          res.render('CurrentEvent',{
            data:rows
          });
        }
        else if(req.session.role === "Process Facilitator") {
          res.render('CurrentEvent_PF',{
            data:rows
          });
        }
        else {
          res.render('CurrentEvent_FAC',{
            data:rows
          });
        }

    }).catch(e => { console.log(e) });
});

app.get('/UpcomingEvents',(req,res)=>{
      conn.execute("SELECT * FROM ASE_EVENTS WHERE EVENT_ID IN (SELECT EVENT_ID FROM EVENT_ASSIGNED WHERE MEMBER_ID=?) AND EVENT_STATUS=?",[req.session.userID, "Upcoming"],).then(([rows]) => {
        res.render('UpcomingEvents',{
            data:rows
        });

    }).catch(e => { console.log(e) });});

app.get('/home',(req,res)=>{
    res.render('home');
});

app.post('/selected_event',(req,res)=>{
      const {selected} = req.body
      console.log(req.session.userID);
      conn.execute("SELECT * FROM ASE_EVENTS WHERE EVENT_ID IN (SELECT EVENT_ID FROM EVENT_ASSIGNED WHERE MEMBER_ID=?) AND EVENT_STATUS=?",[req.session.userID, "Past"],).then(([rows]) => {
          var events =[];
          events = rows;
        conn.execute("SELECT * FROM ASE_EVENTS WHERE EVENT_ID=?",[selected],).then(([rows]) => {
          if(req.session.role === 'Co-Designer') {
            res.render('SelectedEvent',{
              data:rows, events
            });
          }
          else if(req.session.role === 'Process Facilitator') {
            res.render('SelectedEvent_PF',{
              data:rows, events
            });
          }
          else {
            res.render('SelectedEvent_FAC',{
              data:rows, events
            });
          }
      }).catch(e => { console.log(e) });
    }).catch(e => { console.log(e) });
});

app.post('/EditSelectedEvent',(req,res)=>{
      const {selected} = req.body
      console.log(req.session.userID);
      conn.execute("SELECT * FROM ASE_TEAM",).then(result => {
      conn.execute("SELECT * FROM ASE_EVENTS WHERE EVENT_ID=?",[selected],).then(([rows]) => {
          res.render('EditSelectedEvent',{
            data:rows, dropDown:result
          });
    }).catch(e => { console.log(e) });
    }).catch(e => { console.log(e) });
});

app.post('/SaveEvent',(req,res)=>{
      const {event} = req.body
      console.log(req.body);
      conn.execute("UPDATE ASE_EVENTS SET event_name = ?, event_description = ?, event_client = ?, event_pf = ?, event_cofac = ?, event_fac = ?, event_status = ? WHERE EVENT_ID=?",[req.body.name, req.body.description, req.body.client, req.body.pf, req.body.cofac, req.body.fac, req.body.status, req.body.selected],)
        conn.execute("SELECT * FROM ASE_EVENTS WHERE EVENT_ID=?",[req.body.selected],).then(([rows]) => {
          if(req.session.role === "Process Facilitator") {
          res.render('SelectedEvent_PF',{
            data:rows
          });
        }
          else {
            res.render('SelectedEvent_FAC',{
            data:rows
            });
          }
        
    }).catch(e => { console.log(e) });

});


const port = process.env.PORT || 1337;
app.listen(port);
console.log("Server running at http://localhost:%d", port); 

