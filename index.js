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


//Past Events
app.get('/PastEvents',(req,res)=>{
      conn.execute("SELECT * FROM ASE_EVENTS WHERE EVENT_ID IN (SELECT EVENT_ID FROM EVENT_ASSIGNED WHERE MEMBER_ID=?) AND EVENT_STATUS=?",[req.session.userID, "Past"],).then(([rows]) => {
        res.render('PastEvents',{
            data:rows
        });
    }).catch(e => { console.log(e) });
});

app.post('/selected_event',(req,res)=>{
      const {selected} = req.body
      console.log(selected);
      if(req.body.status === "Past") {
        conn.execute("SELECT * FROM ASE_EVENTS WHERE EVENT_ID IN (SELECT EVENT_ID FROM EVENT_ASSIGNED WHERE MEMBER_ID=?) AND EVENT_STATUS=?",[req.session.userID, "Past"],).then(([rows]) => {
          var events =[];
          events = rows;
          conn.execute("SELECT * FROM ASE_EVENTS WHERE EVENT_ID=?",[selected],).then(([rows]) => {
            if(req.session.role === 'Co-Designer') {
              console.log("This is past event -co-designer")
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
      }
      else if (req.body.status === "Upcoming") {
        conn.execute("SELECT * FROM ASE_EVENTS WHERE EVENT_ID IN (SELECT EVENT_ID FROM EVENT_ASSIGNED WHERE MEMBER_ID=?) AND EVENT_STATUS=?",[req.session.userID, "Upcoming"],).then(([rows]) => {
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
      }
});

//Current Event

app.get('/CurrentEvent',(req,res)=>{
  var info = [];
  conn.execute("SELECT * FROM EVENT_ADDNL_INFO WHERE EVENT_ID IN (SELECT EVENT_ID FROM EVENT_ASSIGNED WHERE MEMBER_ID=?) AND EVENT_ID IN (SELECT EVENT_ID FROM ASE_EVENTS WHERE EVENT_STATUS=?)",[req.session.userID, "Current"],).then(([rows]) => {
  info = rows;
  }).catch(e => { console.log(e) });
        conn.execute("SELECT * FROM ASE_EVENTS WHERE EVENT_ID IN (SELECT EVENT_ID FROM EVENT_ASSIGNED WHERE MEMBER_ID=?) AND EVENT_STATUS=?",[req.session.userID, "Current"],).then(([rows]) => {
        if(req.session.role === "Co-Designer") {
          res.render('CurrentEvent',{
            data:rows, info
          });
        }
        else if(req.session.role === "Process Facilitator") {
          res.render('CurrentEvent_PF',{
            data:rows, info
          });
        }
        else {
          res.render('CurrentEvent_FAC',{
            data:rows,info
          });
        }

    }).catch(e => { console.log(e) });
});

app.post('/saveNotes',(req,res)=>{
  console.log(req.body.info_id);
  if(req.body.request_type === "INSERT") {
    conn.execute("INSERT INTO EVENT_ADDNL_INFO (EVENT_ID, MEMBER_ID, EVENT_NOTES) VALUES (?,?,?)",[req.body.event_id, req.session.userID, req.body.event_notes],).catch(e => { console.log(e) });
  }
  else {
        conn.execute("UPDATE EVENT_ADDNL_INFO SET EVENT_NOTES=? WHERE INFO_ID=?",[req.body.event_notes, req.body.info_id],).catch(e => { console.log(e) });
  }
});

//Upcoming Events

app.get('/UpcomingEvents',(req,res)=>{
      conn.execute("SELECT * FROM ASE_EVENTS WHERE EVENT_ID IN (SELECT EVENT_ID FROM EVENT_ASSIGNED WHERE MEMBER_ID=?) AND EVENT_STATUS=?",[req.session.userID, "Upcoming"],).then(([rows]) => {
        res.render('UpcomingEvents',{
            data:rows
        });

    }).catch(e => { console.log(e) });
    });

app.post('/selected_event_upcoming',(req,res)=>{
      const {selected} = req.body
      console.log(selected);
      conn.execute("SELECT * FROM ASE_EVENTS WHERE EVENT_ID IN (SELECT EVENT_ID FROM EVENT_ASSIGNED WHERE MEMBER_ID=?) AND EVENT_STATUS=?",[req.session.userID, "Upcoming"],).then(([rows]) => {
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
      const {status} = req.body
      console.log(status);
      conn.execute("SELECT * FROM ASE_TEAM WHERE ROLE='Process Facilitator'",).then(([rows]) => {
        var pf = [];
        pf = rows;
        conn.execute("SELECT * FROM ASE_TEAM WHERE ROLE='Co-Facilitator'",).then(([rows]) => {
          var cf = [];
          cf = rows;
          conn.execute("SELECT * FROM ASE_TEAM WHERE ROLE='Facilitator'",).then(([rows]) => {
            var f = [];
            f = rows;
            conn.execute("SELECT * FROM ASE_TEAM WHERE ROLE='Co-Designer' OR ROLE='Process Facilitator'",).then(([rows]) => {
            var cd = [];
            cd = rows;
              conn.execute("SELECT * FROM ASE_EVENTS WHERE EVENT_ID=?",[selected],).then(([rows]) => {
                res.render('EditSelectedEvent',{
                  data:rows, pf, cf, f, cd
                });
              }).catch(e => { console.log(e) });      
            }).catch(e => { console.log(e) });      
          }).catch(e => { console.log(e) });
        }).catch(e => { console.log(e) });
      }).catch(e => { console.log(e) });
});

app.post('/SaveEvent',(req,res)=>{
      const{CoDesigner} = req.body
      console.log(req.body);
      var cd = [];
      let values = [];
      cd = req.body.CoDesigner;
      for(var i = 0;i < cd.length;i++) {
           values.push([req.body.selected,cd[i]]); 
      }
      console.log(values);
      var sql = "INSERT INTO EVENT_ASSIGNED (event_id, member_id) VALUES ?";
      conn.query(sql, [values], function(err) {
        if (err) throw err;
        conn.end();
      });
      conn.execute("UPDATE ASE_EVENTS SET event_name = ?, event_description = ?, event_client = ?, event_pf = ?, event_cofac = ?, event_fac = ?, event_status = ? WHERE EVENT_ID=?",[req.body.name, req.body.description, req.body.client, req.body.pf, req.body.cf, req.body.f, req.body.event_status, req.body.selected],)
        if(req.body.event_status === 'Past') {
          conn.execute("SELECT * FROM ASE_EVENTS WHERE EVENT_ID IN (SELECT EVENT_ID FROM EVENT_ASSIGNED WHERE MEMBER_ID=?) AND EVENT_STATUS=?",[req.session.userID, "Past"],).then(([rows]) => {
          var events =[];
          events = rows;
          conn.execute("SELECT * FROM ASE_EVENTS WHERE EVENT_ID=?",[req.body.selected],).then(([rows]) => {
            if(req.session.role === "Process Facilitator") {
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
      }
      else if(req.body.event_status === 'Current') {
          conn.execute("SELECT * FROM ASE_EVENTS WHERE EVENT_ID=?",[req.body.selected],).then(([rows]) => {
            if(req.session.role === "Process Facilitator") {
              res.render('CurrentEvent_PF',{
                data:rows
              });
            }
            else {
              res.render('Current_FAC',{
                data:rows
              });
            }
          }).catch(e => { console.log(e) });
      }
      else if(req.body.event_status === 'Upcoming') {
          conn.execute("SELECT * FROM ASE_EVENTS WHERE EVENT_ID IN (SELECT EVENT_ID FROM EVENT_ASSIGNED WHERE MEMBER_ID=?) AND EVENT_STATUS=?",[req.session.userID, "Upcoming"],).then(([rows]) => {
          var events =[];
          events = rows;
          conn.execute("SELECT * FROM ASE_EVENTS WHERE EVENT_ID=?",[req.body.selected],).then(([rows]) => {
            if(req.session.role === "Process Facilitator") {
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
      }
});

app.get('/home',(req,res)=>{
    res.render('home');
});

app.get('/feedback',(req,res)=>{
  var selected = [];
  conn.execute("SELECT f.*, t.forename, t.surname, a.event_name FROM FEEDBACK_REQUESTS f, ASE_TEAM t, ASE_EVENTS a WHERE f.GIVER_ID = ? AND f.event_id = a.event_id AND t.ID = f.requester_id", [req.session.userID],).then(([rows]) => {
  var requests = [];
  requests = rows;
    conn.execute("SELECT * FROM ASE_EVENTS WHERE EVENT_ID IN (SELECT EVENT_ID FROM EVENT_ASSIGNED WHERE MEMBER_ID = ?)", [req.session.userID],).then(([rows]) => {
    var events = [];
    events = rows;
      conn.execute("SELECT * FROM ASE_TEAM", [req.session.userID],).then(([rows]) => {
      var team = [];
      team = rows;
        conn.execute("SELECT f.*, a.event_name, t.forename, t.surname FROM FEEDBACK f, ASE_EVENTS a, ASE_TEAM t WHERE f.reciever_ID = ? AND f.EVENT_ID = a.EVENT_ID AND f.giver_id=t.ID", [req.session.userID],).then(([rows]) => {
          var feedback = [];
          feedback = rows;
          res.render('feedback',{
            feedback, events, team, requests, selected
          });
        }).catch(e => { console.log(e) });
      }).catch(e => { console.log(e) });
    }).catch(e => { console.log(e) });
  }).catch(e => { console.log(e) });
});

app.post('/selectfeedback',(req,res)=>{
  conn.execute("SELECT f.*, t.forename, t.surname, a.event_name FROM FEEDBACK_REQUESTS f, ASE_TEAM t, ASE_EVENTS a WHERE f.GIVER_ID = ? AND f.event_id = a.event_id AND t.ID = f.requester_id", [req.session.userID],).then(([rows]) => {
  var requests = [];
  requests = rows;
    conn.execute("SELECT * FROM ASE_EVENTS WHERE EVENT_ID IN (SELECT EVENT_ID FROM EVENT_ASSIGNED WHERE MEMBER_ID = ?)", [req.session.userID],).then(([rows]) => {
    var events = [];
    events = rows;
      conn.execute("SELECT * FROM ASE_TEAM", [req.session.userID],).then(([rows]) => {
      var team = [];
      team = rows;
        conn.execute("SELECT f.*, a.event_name, t.forename, t.surname FROM FEEDBACK f, ASE_EVENTS a, ASE_TEAM t WHERE f.reciever_ID = ? AND f.EVENT_ID = a.EVENT_ID AND f.giver_id=t.ID", [req.session.userID],).then(([rows]) => {
          var feedback = [];
          feedback = rows;
          var selected = [];
          console.log(req.body.selected);
            conn.execute("SELECT * FROM FEEDBACK WHERE feedback_id=?",[req.body.selected],).then(([rows]) => {
              selected = rows;
            res.render('feedback',{
                feedback, events, team, requests, selected
              });
          }).catch(e => { console.log(e) });
        }).catch(e => { console.log(e) });
      }).catch(e => { console.log(e) });
    }).catch(e => { console.log(e) });
  }).catch(e => { console.log(e) });
});

app.post('/feedbackRequest', (req,res)=>{
    conn.execute("INSERT INTO FEEDBACK_REQUESTS (requester_id, giver_id, event_id) VALUES(?, ?, ?)",[req.session.userID, req.body.feedback_from, req.body.feedback_event],)
    .catch(e => { console.log(e) });
    res.render('home');
  });

app.post('/giveFeedback', (req,res)=>{
    conn.execute("INSERT INTO FEEDBACK (reciever_id, giver_id, did_well, not_well, improvements, event_id) VALUES(?, ?, ?, ?, ?, ?)",[req.body.requester_id, req.body.giver_id, req.body.did_well, req.body.not_well, req.body.improvements, req.body.event_id],).catch(e => { console.log(e) });
    conn.execute("DELETE FROM FEEDBACK_REQUESTS WHERE request_id = ?",[req.body.request_id],).catch(e => { console.log(e) });
    res.render('home');
  });

app.get('/CreateEvent',(req,res)=>{
    res.render('CreateEvent');
});

app.post('/CreateNewEvent', (req,res)=>{
    conn.execute("INSERT INTO ASE_EVENTS VALUES(?, ?, ?, ?, ?, ?, ?)",[req.body.name, req.body.description, req.body.client, req.body.pf, req.body.cofac, req.body.fac, req.body.event_status],)
    .catch(e => { console.log(e) });
    res.render('home');
  });



const port = process.env.PORT || 1337;
app.listen(port);
console.log("Server running at http://localhost:%d", port); 

