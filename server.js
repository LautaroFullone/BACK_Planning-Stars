const chalk = require('chalk'); 
const PORT = 3000;

const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const players = {};

io.on("connection", socket => {
    
    const handshake = socket.id;

    socket.on("joinParty", data => {
        socket.join(data.partyID);

        console.log(`${chalk.green(`${chalk.underline(`Connected device`)}: ${handshake} on ${data.partyID}`)}`); 

        //io.to(data.partyID).emit("playerJoined_socket", ('##' + 'pepe'));
    });

    socket.on('disconnect', function () {
        console.log(`${chalk.red(`${chalk.underline(`Disconnected device`)}: ${handshake}`)}\n`);
    });
    
});

http.listen(PORT, () => {
    console.log(`\n${chalk.blue(`>> Server listening on port ${PORT}`)}\n`);  
});



 
/*const express = require('express');
const app = express();
const chalk = require('chalk');
const cors = require('cors');

app.use(cors());
const options = {
    cors: {
        origin: 'http://localhost:4200',
    },
};

const server = require('http').Server(app);
const io = require('socket.io')(server, options);

app.get('/', function (req, res) {
    res.send('Hello World!');
});

server.listen(3000, function () {
    console.log('\n')
    console.log(`>> Socket listo y escuchando por el puerto: ${chalk.green('3000')}`)
})

io.on('connection', function (socket) {

    console.log('connection');
    const handshake = socket.id;

    let { nameParty } = socket.handshake.query;
    console.log(`${chalk.green(`Nuevo dispositivo: ${handshake}`)} conentado a la ${nameParty}`);
    /*socket.join(nameRoom)

    socket.on('evento', (res) => {
        // Emite el mensaje a todos lo miembros de las sala menos a la persona que envia el mensaje   
        socket.to(nameRoom).emit('evento', res);

    })


    socket.on('disconnect', function () {
        console.log('user disconnected');
    });
});
*/
