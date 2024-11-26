const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const bodyParser = require('body-parser');
const { Schema } = require('mongoose');
const { type } = require('express/lib/response');

let mongoose; 
try{
  mongoose= require("mongoose");
}catch (e){
  console.log(e);
}

// Mongoose set up coneccion
//-----------------------------------------------------------------------------
mongoose.connect(process.env.MONGO_URI, { })
.then(() => console.log('Conexión a MongoDB establecida'))
.catch(err => console.error('Error de conexión a MongoDB:', err));
// const Schema = mongoose.Schema;
//-----------------------------------------------------------------------------


// esquema de exercise
//-----------------------------------------------------------------------------
const exerciseSchema = new Schema({
  userId : {type: String, require: true},
  description : {type: String, require: true},
  duration : {type: Number, require: true},
  date : {type : Date, default : new Date()}
})
let exerciseModel = mongoose.model("exercise",exerciseSchema);
//-----------------------------------------------------------------------------


// esquema de usuario
//-----------------------------------------------------------------------------
const userSchema = new Schema({
  username : {type: String, require: true}
})
let userModel = mongoose.model("user",userSchema);
//-----------------------------------------------------------------------------

app.use(cors())
app.use(express.static('public'))
app.use("/",bodyParser.urlencoded({extended: false}));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});  

app.post('/api/users',(req,res)=>{
  let username = req.body.username;
  let newUser = userModel({username: username});
  newUser.save();
  res.json(newUser);

});

app.get('/api/users',(req,res)=>{
  userModel.find({}).then((users)=>{
    res.json(users);
  })
});

app.post('/api/users/:_id/exercises',(req,res)=>{
  console.log(req.body);
  let userId = req.params._id;
  let exerciseObj ={
    userId : userId,
    description : req.body.description,
    duration : req.body.duration
  }

  if (req.body.date != ''){
    exerciseObj.date = req.body.date
  }

  let newExercise = new exerciseModel(exerciseObj);
  
  


  // newExercise.save();
  // res.json(newExercise);

  
  
  // userModel.findById(userId, (err, userFound)=>{

  //   // if(err) console.log(err);

  //   newExercise.save();
  //   res.json({
  //     _id : userFound._id,
  //     username : userFound.username,
  //     description : newExercise.description,
  //     duration : newExercise.duration,
  //     date : newExercise.date.toDateString()
  //   })
  // })


  userModel.findById(userId)
  .then(userFound => {
    if (!userFound) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    newExercise.save()
      .then(() => {
        res.json({
          _id: userFound._id,
          username: userFound.username,
          description: newExercise.description,
          duration: newExercise.duration,
          date: newExercise.date.toDateString()
        });
      })
      .catch(err => {
        console.error('Error al guardar el ejercicio:', err);
        res.status(500).json({ error: 'Ocurrió un error al guardar el ejercicio' });
      });

  })
  .catch(err => {
    console.error('Error al buscar el usuario:', err);
    res.status(500).json({ error: 'Ocurrió un error en el servidor' });
  });
});



app.get('/api/users/:_id/logs', (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;

  // Crear un objeto de filtro para las fechas
  let dateFilter = {};

  if (from) {
    dateFilter.$gte = new Date(from); // Si existe el parámetro 'from', agregar filtro
  }

  if (to) {
    dateFilter.$lte = new Date(to); // Si existe el parámetro 'to', agregar filtro
  }

  // Buscar al usuario por ID
  userModel.findById(userId)
    .then(userFound => {
      if (!userFound) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Crear el objeto de respuesta con los detalles del usuario
      let responseObj = {
        _id: userFound._id,
        username: userFound.username
      };

      // Crear un objeto de consulta para los ejercicios, incluyendo el filtro de fechas
      let query = { userId: userId };
      if (from || to) {
        query.date = dateFilter; // Si hay filtro de fechas, incluirlo en la consulta
      }

      // Buscar ejercicios asociados al usuario, aplicando el filtro de fechas y limit
      exerciseModel.find(query)
        .limit(parseInt(limit) || 0) // Aplicar límite, si está presente
        .then(exercises => {
          // Formatear el log con los ejercicios filtrados
          responseObj.log = exercises.map(exercise => ({
            description: exercise.description,
            duration: exercise.duration,
            date: exercise.date.toDateString() // Formato legible de la fecha
          }));

          // Contar los ejercicios filtrados
          responseObj.count = exercises.length;

          // Devolver el objeto JSON con la información del usuario y ejercicios
          res.json(responseObj);
        })
        .catch(err => {
          console.error('Error al buscar los ejercicios:', err);
          res.status(500).json({ error: 'Error al buscar los ejercicios' });
        });
    })
    .catch(err => {
      console.error('Error al buscar el usuario:', err);
      res.status(500).json({ error: 'Error al buscar el usuario' });
    });
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
