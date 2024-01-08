const express = require('express')
const path = require('path')

const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const app = express()
app.use(express.json())
const format = require('date-fns/format')
var isValid = require('date-fns/isValid')

const dbPath = path.join(__dirname, 'todoApplication.db')

let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()

const hasPriorityAndStatusProperties = requestQuery => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  )
}

const hasCategoryAndPriority = requestQuery => {
  return (
    requestQuery.priority !== undefined && requestQuery.category !== undefined
  )
}

const hasCategoryAndStatus = requestQuery => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  )
}

const hasPriorityProperty = requestQuery => {
  return requestQuery.priority !== undefined
}

const hasStatusProperty = requestQuery => {
  return requestQuery.status !== undefined
}
const hasCategroyProperty = requestQuery => {
  return requestQuery.category !== undefined
}

const checkPriority = priority => {
  return priority === 'HIGH' || priority === 'LOW' || priority === 'MEDIUM'
}
const checkStatus = status => {
  return status === 'TO DO' || status === 'IN PROGRESS' || status === 'DONE'
}
const checkCategory = category => {
  return category === 'WORK' || category === 'HOME' || category === 'LEARNING'
}
const checkDate = date => {
  if (isValid(new Date(date))) {
    return true
  }
  return false
}

app.get('/todos/', async (request, response) => {
  let data = null
  let getTodosQuery = ''
  const {search_q = '', priority, status, category, date} = request.query
  console.log(search_q)
  let l = false
  let text = ''
  switch (true) {
    case hasPriorityAndStatusProperties(request.query): //if this is true then below query is taken in the code
      l = true
      getTodosQuery = `
   SELECT
    id as id , todo as todo , priority as priority,status as status,category as category, due_date as dueDate
   FROM
    todo 
   WHERE
    todo LIKE '%${search_q}%'
    AND status = '${status}'
    AND priority = '${priority}';`
      break

    case hasCategoryAndPriority(request.query): //if this is true then below query is taken in the code
      getTodosQuery = `
   SELECT
     id as id , todo as todo , priority as priority,status as status,category as category, due_date as dueDate
   
   FROM
    todo 
   WHERE
    todo LIKE '%${search_q}%'
    AND category = '${category}'
    AND priority = '${priority}';`
      l = true
      break
    case hasPriorityProperty(request.query):
      if (checkPriority(priority)) {
        getTodosQuery = `
   SELECT
     id as id , todo as todo , priority as priority,status as status,category as category, due_date as dueDate
   
   FROM
    todo 
   WHERE
    todo LIKE '%${search_q}%'
    AND priority = '${priority}';`
        l = true
      } else {
        text = 'Invalid Todo Priority'
      }

      break
    case hasStatusProperty(request.query):
      console.log(checkStatus(status))
      if (checkStatus(status)) {
        getTodosQuery = `
   SELECT
     id as id , todo as todo , priority as priority,status as status,category as category, due_date as dueDate
   
   FROM
    todo 
   WHERE
    todo LIKE '%${search_q}%'
    AND status = '${status}';`
        l = true
      } else {
        text = 'Invalid Todo Status'
      }
      break

    case hasCategroyProperty(request.query):
      if (checkCategory(category)) {
        l = true
        getTodosQuery = `
   SELECT
     id as id , todo as todo , priority as priority,status as status,category as category, due_date as dueDate
   
   FROM
    todo 
   WHERE
    todo LIKE '%${search_q}%'
    AND category = '${category}';`
      } else {
        text = 'Invalid Todo Category'
      }
      break
    case hasCategoryAndStatus(request.query):
      l = true
      getTodosQuery = `SELECT
     id as id , todo as todo , priority as priority,status as status,category as category, due_date as dueDate
   
   FROM
    todo 
   WHERE
    todo LIKE '%${search_q}%'
    AND status = '${status}'
    AND categroy = '${category}';`
      break
    default:
      l = true
      getTodosQuery = `SELECT
     id as id , todo as todo , priority as priority,status as status,category as category, due_date as dueDate
   
   FROM
    todo 
   WHERE
    todo LIKE '%${search_q}%'
  ;`
  }

  if (l === true) {
    data = await db.all(getTodosQuery)
    response.send(data)
  } else {
    response.status(400)
    response.send(text)
  }
})

app.get('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const query = `select  id as id , todo as todo , priority as priority,status as status,category as category, due_date as dueDate
    from todo where id =${todoId}`
  const res = await db.get(query)
  response.send(res)
})

app.get('/agenda/', async (request, response) => {
  const {date} = request.query
  if (checkDate(date)) {
    const newDate = format(new Date(date), 'yyyy-MM-dd')

    console.log(isValid(new Date(date)))
    const query = `select  id as id , todo as todo , priority as priority,status as status,category as category, due_date as dueDate
    from todo where due_date ='${newDate}'`
    const res = await db.all(query)
    response.send(res)
  } else {
    response.status(400)
    response.send('Invalid Due Date')
  }
})

app.post('/todos/', async (request, response) => {
  const {id, todo, priority, status, category, dueDate} = request.body //Destructuring id column
  console.log(id, todo, priority, status, category, dueDate)
  if (!checkStatus(status)) {
    response.status(400)
    response.send('Invalid Todo Status')
  } else if (!checkCategory(category)) {
    response.status(400)
    response.send('Invalid Todo Category')
  } else if (!checkDate(dueDate)) {
    response.status(400)
    response.send('Invalid Due Date')
  } else if (!checkPriority(priority)) {
    response.status(400)
    response.send('Invalid Todo Priority')
  } else {
    const insertTodo = `
        INSERT INTO todo (id, todo, priority, status,category,due_date)
        VALUES (${id},'${todo}','${priority}','${status}','${category}','${dueDate}')` //Updated the id column inside the SQL Query
    await db.run(insertTodo)
    response.send('Todo Successfully Added')
  }
})

app.put('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const requestBody = request.body

  let column = ''
  switch (true) {
    case requestBody.status !== undefined:
      column = 'Status'
      break
    case requestBody.priority !== undefined:
      column = 'Priority'
      break
    case requestBody.todo !== undefined:
      column = 'Todo'
      break
    case requestBody.category !== undefined:
      column = 'Category'
      break
    case requestBody.dueDate !== undefined:
      column = 'Due Date'
      break
  }
  const query = `select * from todo where id =${todoId}`
  const previousTodo = await db.get(query)
  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    dueDate = previousTodo.due_date,
  } = request.body

  if (!checkStatus(status)) {
    response.status(400)
    response.send('Invalid Todo Status')
  } else if (!checkCategory(category)) {
    response.status(400)
    response.send('Invalid Todo Category')
  } else if (!checkDate(dueDate)) {
    response.status(400)
    response.send('Invalid Due Date')
  } else if (!checkPriority(priority)) {
    response.status(400)
    response.send('Invalid Todo Priority')
  } else {
    const updateQuery = `update todo set todo ='${todo}',
  priority='${priority}',
  status='${status}',
  category='${category}',
  due_date='${dueDate}'`

    await db.run(updateQuery)
    response.send(`${column} Updated`)
  }
})

app.delete('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const query = `DELETE FROM todo where id=${todoId};`
  await db.run(query)
  response.send('Todo Deleted')
})

module.exports = app
