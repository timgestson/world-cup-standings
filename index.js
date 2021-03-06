const fetch = require('node-fetch')
const _ = require('underscore')
const express = require('express')
const PORT = process.env.PORT || 8080

const getData = async ()=>{
  let resp = await fetch("http://api.football-data.org/v1/competitions/467/fixtures")
  let json = await resp.json()
  return json
}

const getGoals = (team, data) => {
  let matches = data.fixtures.filter((match) => (match.homeTeamName == team || match.awayTeamName == team))
  let goals = matches.reduce((goals, match) => (match.homeTeamName == team ? goals + match.result.goalsHomeTeam : goals + match.result.goalsAwayTeam), 0)
  let goalsAgainst = matches.reduce((goals, match) => (match.homeTeamName != team ? goals + match.result.goalsHomeTeam : goals + match.result.goalsAwayTeam), 0)
  return { goals: goals, goalsAgainst: goalsAgainst }
}

const getGoalPoints = (team, data) => {
  let goals = getGoals(team, data)
  return (.2 * goals.goals - .1 * goals.goalsAgainst)
}

const getGroupTeams = (team, data) => {
  let matches = data.fixtures.filter((match) => (match.homeTeamName == team || match.awayTeamName == team) && match.matchday < 4)
  let teams = _.chain(matches)
  .map((match)=> [match.homeTeamName, match.awayTeamName])
  .flatten()
  .uniq()
  .value()
  return teams
}

const getGroupPoints = (team, data) => {
  let matches = data.fixtures.filter((match) => match.status == "FINISHED" && (match.homeTeamName == team || match.awayTeamName == team) && match.matchday < 4)
  let points = matches.reduce((points, match) => {
    if((match.homeTeamName == team && match.result.goalsHomeTeam > match.result.goalsAwayTeam) || (match.awayTeamName == team && match.result.goalsAwayTeam > match.result.goalsHomeTeam)) 
      return points + 3
    else if((match.homeTeamName == team && match.result.goalsAwayTeam > match.result.goalsHomeTeam) || (match.awayTeamName == team && match.result.goalsHomeTeam > match.result.goalsAwayTeam))
      return points
    else(match.result.goalsHomeTeam == match.result.goalsHomeTeam)
      return points + 1
  }, 0)
  return points
}

const getGroupStandings = (team, data) => {
  let teams = getGroupTeams(team, data)
  let standings = _.chain(teams)
  .map((team)=>{ 
    let goals = getGoals(team, data)
    return { 
      team: team,
      points: getGroupPoints(team, data),
      goalDiff: goals.goals - goals.goalsAgainst
    }
  })
  .sortBy('goalDiff')
  .sortBy('points')
  .reverse()
  .value()
  return standings
}

const groupStageOver = (team, data) => {
  let matches = data.fixtures.filter((match) => match.status == "FINISHED" && (match.homeTeamName == team || match.awayTeamName == team) && match.matchday < 4)
  return matches.length == 3
}

const getGroupStagePoints = (team, data) => {
  if(groupStageOver(team, data)){
    let standings = getGroupStandings(team, data) 
    if(standings[0].team == team)
      return 2
    else if(standings[1].team == team)
      return 1
    else
      return 0
  }else{
    return 0
  }
}

const wonMatchDay = (team, data, day) => {
  let matches = data.fixtures.filter((match) => match.status == "FINISHED" && (match.homeTeamName == team || match.awayTeamName == team) && match.matchday == day)
  if(matches.length == 1){
    let match = matches[0]
    if((match.homeTeamName == team && match.result.goalsHomeTeam > match.result.goalsAwayTeam) || (match.awayTeamName == team && match.result.goalsAwayTeam > match.result.goalsHomeTeam))
      return 1
    else if(match.result.goalsHomeTeam == match.result.goalsAwayTeam && ((match.homeTeamName == team && match.result.penaltyShootout.goalsHomeTeam > match.result.penaltyShootout.goalsAwayTeam) || (match.awayTeamName == team && match.result.penaltyShootout.goalsAwayTeam > match.result.penaltyShootout.goalsHomeTeam))) // won in penalties
      return 1  
    else
      return 0
  }else{
    return 0
  }
}

const wonRoundOf16 = (team, data) => {
  return wonMatchDay(team, data, 4)
}

const wonRoundOf8 = (team, data) => {
  return wonMatchDay(team, data, 5)
}

const wonRoundOf4 = (team, data) => {
  return wonMatchDay(team, data, 6)
}

const wonRoundOf2 = (team, data) => {
  return wonMatchDay(team, data, 7)
}

const getCompetitionPoints = (team, data) => {
  return  getGoalPoints(team, data) + getGroupStagePoints(team, data) + wonRoundOf16(team, data) + 2 * wonRoundOf8(team, data) + 3 * wonRoundOf4(team, data) + 4 * wonRoundOf2(team, data)
}


const selections = [
  { name: "Dan",
    teams: [ "Germany", "Denmark", "Panama", "Saudi Arabia"],
    salaries: [
      {
        team: "Germany",
        salary: 61
      },
      { 
        team: "Denmark",
        salary: 17
      },
      {
        team: "Panama",
        salary: 11
      },
      {
        team: "Saudi Arabia",
        salary: 11
      }
    ]
  },
  { name: "Joel",
    teams: [ "Uruguay", "Portugal", "England", "Morocco"],
    salaries: [
      {
        team: "Uruguay",
        salary: 30
      },
      { 
        team: "Portugal",
        salary: 26
      },
      {
        team: "England",
        salary: 32
      },
      {
        team: "Morocco",
        salary: 12
      }
    ]
  },
  { name: "Scott",
    teams: ["Uruguay", "Russia", "Poland", "Denmark"],
    salaries: [
      {
        team: "Uruguay",
        salary: 30
      },
      { 
        team: "Russia",
        salary: 26
      },
      {
        team: "Poland",
        salary: 23
      },
      {
        team: "Denmark",
        salary: 17
      }
    ]
  },
  { name: "Tim",
    teams: ["Brazil", "Mexico", "Nigeria", "Serbia" ],
    salaries: [
      {
        team: "Brazil",
        salary: 54
      },
      { 
        team: "Mexico",
        salary: 17
      },
      {
        team: "Nigeria",
        salary: 13
      },
      {
        team: "Serbia",
        salary: 15
      }
    ]
  },
  { name: "Phil",
    teams: ["Colombia", "Uruguay", "Portugal", "Denmark" ],
    salaries: [
      {
        team: "Uruguay",
        salary: 30
      },
      { 
        team: "Portugal",
        salary: 26
      },
      {
        team: "Colombia",
        salary: 27
      },
      {
        team: "Denmark",
        salary: 17
      }
    ]
  },
  { name: "Shelly",
    teams: ["Spain", "Poland", "Denmark", "Iceland"],
    salaries: [
      {
        team: "Spain",
        salary: 47
      },
      { 
        team: "Poland",
        salary: 23
      },
      {
        team: "Denmark",
        salary: 17
      },
      {
        team: "Iceland",
        salary: 13
      }
    ]
  }
]

const calculate = (data)=>{
  let standings = selections.map((contestant)=>{
    let points = contestant.teams.reduce((points, team)=> points + getCompetitionPoints(team, data),0)
    points = Math.round(points * 100) / 100
    let goals = contestant.teams.reduce((points, team)=> points + getGoalPoints(team, data),0)
    goals = Math.round(goals * 100) / 100
    let group = contestant.teams.reduce((points, team)=> points + getGroupStagePoints(team, data),0)
    let quarter = contestant.teams.reduce((points, team)=> points + wonRoundOf16(team, data),0)
    let semis = contestant.teams.reduce((points, team)=> points + wonRoundOf8(team, data),0)
    let finals = contestant.teams.reduce((points, team)=> points + wonRoundOf4(team, data),0)
    let winner = contestant.teams.reduce((points, team)=> points + wonRoundOf2(team, data),0)
    return { name: contestant.name, points: points, goals: goals, group: group, quarter: quarter, semis: semis, finals: finals, winner: winner}
  })
  standings = _.chain(standings)
  .sortBy((standing)=> 1 - standing.points)
  .value()

  let details = selections.map((person)=>{
    person.salaries = person.salaries.map((team)=>{
      team.points = getCompetitionPoints(team.team, data)
      team.points = Math.round(team.points * 100) / 100
      return team
    })
    return person
  })
  return { standings: standings, details: details }
}

let app = express()
app.set('view engine', 'pug')
app.use('/static', express.static('public'))

app
.get('/', (req, resp) => {
  getData().then(calculate)
  .then((data)=> resp.render('index', {standings: data.standings, details: data.details}))
})
.listen(PORT)
