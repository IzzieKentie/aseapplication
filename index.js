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
    conn.execute("SELECT * FROM ase_team WHERE ID=?",[req.session.userID]).then(([rows]) => {
        console.log(rows[0].forename);
        res.render('home',{
            name:rows[0].forename
        });

    }).catch(e => { console.log(e) });
});

app.get('/home', ifNotLoggedin, (req,res,next) => {
    conn.execute("SELECT * FROM ase_team WHERE ID=?",[req.session.userID]).then(([rows]) => {
        console.log(rows[0].forename);
        res.render('home',{
            name:rows[0].forename
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
                    res.render('home', {
                      name:rows[0].forename
                    });
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
  var role = req.session.role;
  if(req.body.status === "Past") {
    conn.execute("SELECT * FROM ASE_EVENTS WHERE EVENT_ID IN (SELECT EVENT_ID FROM EVENT_ASSIGNED WHERE MEMBER_ID=?) AND EVENT_STATUS=?",[req.session.userID, "Past"],).then(([rows]) => {
      var events =[];
      events = rows;
      var upcoming = "False";
      conn.execute("SELECT * FROM ASE_EVENTS WHERE EVENT_ID=?",[selected],).then(([rows]) => {
        res.render('SelectedEvent',{
          data:rows, events, role, upcoming
        });
      }).catch(e => { console.log(e) });
    }).catch(e => { console.log(e) });
  }
  else if (req.body.status === "Upcoming") {
    conn.execute("SELECT * FROM ASE_EVENTS e, ASE_TEAM t WHERE e.EVENT_ID IN (SELECT EVENT_ID FROM EVENT_ASSIGNED WHERE MEMBER_ID=?) AND e.EVENT_STATUS=? AND t.ID=?",[req.session.userID, "Upcoming", req.session.userID],).then(([rows]) => {
      var events =[];
      events = rows;
      var upcoming = "True";
      conn.execute("SELECT * FROM ASE_EVENTS WHERE EVENT_ID=?",[selected],).then(([rows]) => {
        res.render('SelectedEvent',{
          data:rows, events, role, upcoming
        });
      }).catch(e => { console.log(e) });
    }).catch(e => { console.log(e) });
  }
});

//Current Event

app.get('/CurrentEvent',(req,res)=>{
  var info = [];
  var tasks =[];
  var event = [];
  var team = [];
  var role = req.session.role;
  var modules = [];
  var id = "";
  var breakouts = [];
  var all_tasks =  []
  conn.execute("SELECT * FROM EVENT_ADDNL_INFO WHERE EVENT_ID IN (SELECT EVENT_ID FROM EVENT_ASSIGNED WHERE MEMBER_ID=?) AND EVENT_ID IN (SELECT EVENT_ID FROM ASE_EVENTS WHERE EVENT_STATUS=?) AND MEMBER_ID=?",[req.session.userID, "Current", req.session.userID],).then(([rows]) => {
    info = rows;
  }).catch(e => { console.log(e) });
  conn.execute("SELECT * FROM ASE_TEAM WHERE ID IN (SELECT MEMBER_ID FROM EVENT_ASSIGNED WHERE EVENT_ID IN (SELECT EVENT_ID FROM ASE_EVENTS WHERE EVENT_ID IN (SELECT EVENT_ID FROM EVENT_ASSIGNED WHERE MEMBER_ID=?) AND EVENT_STATUS=?))",[req.session.userID, "Current"],).then(([rows]) => {
    team = rows;
  }).catch(e => { console.log(e) });
  conn.execute("SELECT t.*, a.event_name, te.forename, te.surname FROM EVENT_TASKS t, ASE_EVENTS a, ASE_TEAM te WHERE t.ASSIGNED_ID = te.ID AND t.ASSIGNED_ID = ? AND a.event_status = ? ",[req.session.userID, "Current"],).then(([rows]) => {
    tasks = rows;
  }).catch(e => { console.log(e) });
  conn.execute("  SELECT t.*, a.event_name, te.forename, te.surname FROM EVENT_TASKS t, ASE_EVENTS a, ASE_TEAM te WHERE t.ASSIGNED_ID = te.ID AND t.ASSIGNED_ID IN (SELECT ID FROM ASE_TEAM WHERE ID IN (SELECT MEMBER_ID FROM EVENT_ASSIGNED WHERE EVENT_ID IN (SELECT EVENT_ID FROM ASE_EVENTS WHERE EVENT_ID IN (SELECT EVENT_ID FROM EVENT_ASSIGNED WHERE MEMBER_ID=?)))) AND a.event_status = ?",[req.session.userID, "Current"],).then(([rows]) => {
    all_tasks = rows;
  }).catch(e => { console.log(e) });
  conn.execute("SELECT * FROM ASE_EVENTS WHERE EVENT_ID IN (SELECT EVENT_ID FROM EVENT_ASSIGNED WHERE MEMBER_ID=?) AND EVENT_STATUS=?",[req.session.userID, "Current"],).then(([rows]) => {
    event = rows;
  }).catch(e => { console.log(e) });
  conn.execute("SELECT * FROM EVENT_MODULE_BREAKOUTS WHERE MODULE_ID IN (SELECT MODULE_ID FROM EVENT_FOTD_MODULES WHERE EVENT_ID IN (SELECT EVENT_ID FROM ASE_EVENTS WHERE EVENT_ID IN (SELECT EVENT_ID FROM EVENT_ASSIGNED WHERE MEMBER_ID=?) AND EVENT_STATUS=?))",[req.session.userID, "Current"],).then(([rows]) => {
    breakouts = rows;
  }).catch(e => { console.log(e) });
  conn.execute("SELECT * FROM EVENT_FOTD_MODULES WHERE EVENT_ID IN (SELECT EVENT_ID FROM ASE_EVENTS WHERE EVENT_ID IN (SELECT EVENT_ID FROM EVENT_ASSIGNED WHERE MEMBER_ID=?) AND EVENT_STATUS=?) ORDER BY module_start_time ASC",[req.session.userID, "Current"],).then(([rows]) => {
    modules = rows;
    console.log(modules);
    res.render('CurrentEvent',{
      event, info, tasks, team, role, modules, breakouts, all_tasks
    });
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
  res.redirect('back');

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
          var upcoming = "True";
        conn.execute("SELECT * FROM ASE_EVENTS WHERE EVENT_ID=?",[selected],).then(([rows]) => {
            res.render('SelectedEvent',{
              data:rows, events, upcoming
            });
          
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
              conn.execute("SELECT t.ID FROM ASE_TEAM t, EVENT_ASSIGNED a WHERE a.EVENT_ID=1 AND t.ID = a.member_id;",).then(([rows]) => {
                var assigned = [];
                assigned = rows;
                console.log(assigned);
                  conn.execute("SELECT * FROM ASE_EVENTS WHERE EVENT_ID=?",[selected],).then(([rows]) => {
                    res.render('EditSelectedEvent',{
                      data:rows, pf, cf, f, cd, assigned
                    });
                  }).catch(e => { console.log(e) });    
              }).catch(e => { console.log(e) });      
            }).catch(e => { console.log(e) });      
          }).catch(e => { console.log(e) });
        }).catch(e => { console.log(e) });
      }).catch(e => { console.log(e) });
});

app.post('/SaveEvent',(req,res)=>{
  const{CoDesigner} = req.body
  var cd = [];
  let values = [];
  cd = req.body.CoDesigner;
  var role = req.session.role;
  for(var i = 0;i < cd.length;i++) {
    values.push([req.body.selected,cd[i]]); 
  }
  values.push([req.body.selected,req.body.pf]);
  values.push([req.body.selected,req.body.cf]);
  values.push([req.body.selected,req.body.f]);
  var removeSQL = "DELETE FROM EVENT_ASSIGNED WHERE EVENT_ID = ?"
  conn.query(removeSQL, [req.body.selected], function(err) {
    if (err) throw err;
    conn.end();
  });
  var sql = "INSERT INTO EVENT_ASSIGNED (event_id, member_id) VALUES ?";
  conn.query(sql, [values], function(err) {
    if (err) throw err;
    conn.end();
  });
  var status = "";
  function formatDate(date) {
    var d = new Date(date),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) 
        month = '0' + month;
    if (day.length < 2) 
        day = '0' + day;

    return [year, month, day].join('-');
  }
  var date = new Date();
  console.log(Date.parse(formatDate(Date.now())));
  if(Date.parse(req.body.start) > Date.parse(formatDate(Date.now()))) {
      status = "Upcoming";
  }
  else if(Date.parse(req.body.end) < Date.parse(formatDate(Date.now()))) {
      status = "Past";
  }
  else if(Date.parse(req.body.start) <= Date.parse(formatDate(Date.now())) <= Date.parse(req.body.end)) {
      status = "Current";
  }
  console.log(status);
    var prof = "";
  var cf = "";
  var f = ""
  conn.execute("SELECT forename, surname from ASE_TEAM WHERE ID = ?",[req.body.pf],).then(([rows]) => {
      prof = rows[0].forename + " " + rows[0].surname;
      conn.execute("SELECT forename, surname from ASE_TEAM WHERE ID = ?",[req.body.cf],).then(([rows]) => {
          cf = rows[0].forename + " " + rows[0].surname;
          conn.execute("SELECT forename, surname from ASE_TEAM WHERE ID = ?",[req.body.f],).then(([rows]) => {
            f = rows[0].forename + " " + rows[0].surname;
  
  conn.execute("UPDATE ASE_EVENTS SET event_name = ?, event_description = ?, event_client = ?, event_pf = ?, event_cofac = ?, event_fac = ?, event_start_date = ?, event_end_date = ?, event_status = ? WHERE EVENT_ID=?",[req.body.name, req.body.description, req.body.client, prof, cf, f, req.body.start, req.body.end, status, req.body.selected],)
    if(status === 'Past') {
      conn.execute("SELECT * FROM ASE_EVENTS WHERE EVENT_ID IN (SELECT EVENT_ID FROM EVENT_ASSIGNED WHERE MEMBER_ID=?) AND EVENT_STATUS=?",[req.session.userID, "Past"],).then(([rows]) => {
        var events =[];
        events = rows;
        var upcoming = "False";
        conn.execute("SELECT * FROM ASE_EVENTS WHERE EVENT_ID=?",[req.body.selected],).then(([rows]) => {
          res.render('SelectedEvent',{
            data:rows, events, role, upcoming
          });
        }).catch(e => { console.log(e) });
      }).catch(e => { console.log(e) });
    }
    else if(status === 'Current') {
      conn.execute("SELECT * FROM ASE_EVENTS WHERE EVENT_ID=?",[req.body.selected],).then(([rows]) => {
        res.redirect('CurrentEvent');        
      }).catch(e => { console.log(e) });
    }
    else if(status === 'Upcoming') {
      conn.execute("SELECT * FROM ASE_EVENTS WHERE EVENT_ID IN (SELECT EVENT_ID FROM EVENT_ASSIGNED WHERE MEMBER_ID=?) AND EVENT_STATUS=?",[req.session.userID, "Upcoming"],).then(([rows]) => {
        var events =[];
        events = rows;
        var upcoming = "True";
        conn.execute("SELECT * FROM ASE_EVENTS WHERE EVENT_ID=?",[req.body.selected],).then(([rows]) => {
          console.log(upcoming);
          res.render('SelectedEvent',{
            data:rows, events, role, upcoming
          });
        }).catch(e => { console.log(e) });
      }).catch(e => { console.log(e) });
    }
    }).catch(e => { console.log(e) });
  }).catch(e => { console.log(e) });
}).catch(e => { console.log(e) });
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
      res.redirect('feedback');
  });

app.post('/giveFeedback', (req,res)=>{
    conn.execute("INSERT INTO FEEDBACK (reciever_id, giver_id, did_well, not_well, improvements, event_id) VALUES(?, ?, ?, ?, ?, ?)",[req.body.requester_id, req.body.giver_id, req.body.did_well, req.body.not_well, req.body.improvements, req.body.event_id],).catch(e => { console.log(e) });
    conn.execute("DELETE FROM FEEDBACK_REQUESTS WHERE request_id = ?",[req.body.request_id],).catch(e => { console.log(e) });
  res.redirect('feedback');
  });

app.get('/CreateEvent',(req,res)=>{
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
          res.render('CreateEvent',{
            pf, cf, f, cd
          });    
        }).catch(e => { console.log(e) });      
      }).catch(e => { console.log(e) });
    }).catch(e => { console.log(e) });
  }).catch(e => { console.log(e) });
});

app.post('/CreateNewEvent', (req,res)=>{
  var event = [];
  console.log(req.body);
  var cofac = req.body.cofac;
  var fac = req.body.fac;
  var pf = req.body.pf;
    var status = "";
  function formatDate(date) {
    var d = new Date(date),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) 
        month = '0' + month;
    if (day.length < 2) 
        day = '0' + day;

    return [year, month, day].join('-');
  }
  var date = new Date();
  console.log(Date.parse(formatDate(Date.now())));
  if(Date.parse(req.body.start) > Date.parse(formatDate(Date.now()))) {
      status = "Upcoming";
  }
  else if(Date.parse(req.body.end) < Date.parse(formatDate(Date.now()))) {
      status = "Past";
  }
  else if(Date.parse(req.body.start) <= Date.parse(formatDate(Date.now())) <= Date.parse(req.body.end)) {
      status = "Current";
  }
  var prof = "";
  var cf = "";
  var f = "";
  conn.execute("SELECT forename, surname from ASE_TEAM WHERE ID = ?",[req.body.pf],).then(([rows]) => {
      prof = rows[0].forename + " " + rows[0].surname;
  
  conn.execute("SELECT forename, surname from ASE_TEAM WHERE ID = ?",[req.body.cofac],).then(([rows]) => {
      cf = rows[0].forename + " " + rows[0].surname;
  conn.execute("SELECT forename, surname from ASE_TEAM WHERE ID = ?",[req.body.fac],).then(([rows]) => {
      f = rows[0].forename + " " + rows[0].surname;
  conn.execute("INSERT INTO ASE_EVENTS (event_name, event_description, event_client, event_pf, event_cofac, event_fac, event_status, event_start_date, event_end_date) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)",[req.body.name, req.body.description, req.body.client, prof, cf, f, status, req.body.start, req.body.end],)
  .catch(e => { console.log(e) });
  conn.execute("SELECT event_id FROM ASE_EVENTS ORDER BY event_id DESC LIMIT 1",).then(([rows]) => {
    event = rows;
    var cd = [];
    let values = [];
    cd = req.body.CoDesigner;
    var role = req.session.role;
    console.log(event[0].event_id);
    for(var i = 0;i < cd.length;i++) {
      values.push([event[0].event_id,cd[i]]); 
    }
    console.log(cofac);
    console.log(fac);
    console.log(pf);
    values.push([event[0].event_id,cofac]);
    values.push([event[0].event_id,fac]);
    values.push([event[0].event_id,pf]);
    var sql = "INSERT INTO EVENT_ASSIGNED (event_id, member_id) VALUES ?";
    conn.query(sql, [values], function(err) {
      if (err) throw err;
      conn.end();
    });
  }).catch(e => { console.log(e) });
  if(status === "Upcoming") {
      res.redirect('UpcomingEvents');  
  }
  else if(status === "Past") {
      res.redirect('PastEvents');  
  }
  else if(status === "Current") {
      res.redirect('CurrentEvent');  
  }
  }).catch(e => { console.log(e) });
  }).catch(e => { console.log(e) });
}).catch(e => { console.log(e) });
});

app.post('/in-progress', (req,res) =>{
    conn.execute("UPDATE EVENT_TASKS SET TASK_STATUS=? WHERE TASK_ID=?",["In Progress", req.body.task_id],)
    .catch(e => { console.log(e) });
    res.redirect('CurrentEvent');
});

app.get('/profile', (req,res) =>{
    conn.execute("SELECT * FROM TEAM_PROFILE WHERE MEMBER_ID = ?",[req.session.userID],).then(([rows]) => {
      res.render('profile', {
        data:rows
      });
    }).catch(e => { console.log(e) });
});

app.get('/encyclopedia', (req,res) =>{
    conn.execute("SELECT * FROM ASE_ENCYCLOPEDIA ORDER BY term asc",).then(([rows]) => {
      res.render('encyclopedia', {
        data:rows
      });
    }).catch(e => { console.log(e) });
});

app.post('/review', (req,res) =>{
    conn.execute("UPDATE EVENT_TASKS SET TASK_STATUS=? WHERE TASK_ID=?",["Review", req.body.task_id],)
    .catch(e => { console.log(e) });
    res.redirect('CurrentEvent');
});

app.post('/block', (req,res) =>{
    conn.execute("UPDATE EVENT_TASKS SET TASK_STATUS=? WHERE TASK_ID=?",["Blocked", req.body.task_id],)
    .catch(e => { console.log(e) });
    res.redirect('CurrentEvent');
});

app.post('/complete', (req,res) =>{
    conn.execute("UPDATE EVENT_TASKS SET TASK_STATUS=? WHERE TASK_ID=?",["Complete", req.body.task_id],)
    .catch(e => { console.log(e) });
    res.redirect('CurrentEvent');
});

app.post('/saveTask', (req,res) =>{
    conn.execute("UPDATE EVENT_TASKS SET TASK_NAME=? WHERE TASK_ID=?",[req.body.task_name, req.body.task_id],)
    .catch(e => { console.log(e) });
    conn.execute("UPDATE EVENT_TASKS SET ASSIGNED_ID=? WHERE TASK_ID=?",[req.body.assigned, req.body.task_id],)
    .catch(e => { console.log(e) });
    res.redirect('CurrentEvent');
});

app.post('/newTask', (req,res) =>{
    conn.execute("INSERT INTO EVENT_TASKS (task_name, event_id, assigned_id, task_status) VALUES (?,?,?,?)",[req.body.task_name, req.body.event_id, req.body.team_member ,"To Do"],)
    .catch(e => { console.log(e) });
    res.redirect('CurrentEvent');
});

app.post('/newModule', (req,res) =>{
    conn.execute("INSERT INTO EVENT_FOTD_MODULES (event_id, module_name, module_start_time, module_end_time, module_location, module_leader) VALUES (?,?,?,?,?,?)",[req.body.event_id, req.body.module_name, req.body.module_start_time, req.body.module_end_time, req.body.module_location, req.body.module_leader],)
    .catch(e => { console.log(e) });
    res.redirect('CurrentEvent');
});

app.post('/newBreakout', (req,res) =>{
    conn.execute("INSERT INTO EVENT_MODULE_BREAKOUTS (module_id, breakout_name) VALUES (?,?)",[req.body.module_id, req.body.breakout_name],)
    .catch(e => { console.log(e) });
    res.redirect('CurrentEvent');
});

app.post('/saveModule', (req,res) =>{
    conn.execute("UPDATE EVENT_FOTD_MODULES SET MODULE_NAME=?, MODULE_START_TIME=?, MODULE_END_TIME=?, MODULE_LOCATION=?, MODULE_LEADER=? WHERE MODULE_ID=?",[req.body.module_name, req.body.module_start, req.body.module_end, req.body.module_location, req.body.module_leader, req.body.module_id],)
    .catch(e => { console.log(e) });
    res.redirect('CurrentEvent');
});

app.post('/saveBreakout', (req,res) =>{
    conn.execute("UPDATE EVENT_MODULE_BREAKOUTS SET BREAKOUT_NAME=? WHERE BREAKOUT_ID=?",[req.body.breakout_name, req.body.breakout_id],)
    .catch(e => { console.log(e) });
    res.redirect('CurrentEvent');
});

app.post('/deleteEvent', (req,res) =>{
    conn.execute("DELETE FROM ASE_EVENTS WHERE EVENT_ID = ?",[req.body.selected],)
    .catch(e => { console.log(e) });
    conn.execute("DELETE FROM EVENT_ASSIGNED WHERE EVENT_ID = ?",[req.body.selected],)
    .catch(e => { console.log(e) });
    res.redirect('UpcomingEvents');
});

const port = process.env.PORT || 1337;
app.listen(port);
console.log("Server running at http://localhost:%d", port); 

