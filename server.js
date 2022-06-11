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
