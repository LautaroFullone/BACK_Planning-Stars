const chalk = require('chalk'); 
const PORT = 3000;

const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);

io.on("connection", (socket) => {
    
    const handshake = socket.id;

    console.log(`${chalk.bgGreen(`Connected device: ${handshake}`)}\n`);
 
    socket.on("joinParty", (data) => {
        let partyID = data.party; let user = data.user;

        socket.join(partyID, () => {
            socket.emit("actualPlayerJoin_socket", user.name); //event to player that's joining
            socket.broadcast.to(partyID).emit("playerJoin_socket", user.name);  //event to rest of players (except joinning player)
            console.log(`${chalk.green(`${chalk.underline(`Join party`)}: ${user.name} on ${partyID}`)}\n`); 
        });
    });

    socket.on('leaveParty', (data) => {
        let partyID = data.party; let user = data.user;

        socket.leave(partyID, () => {
            socket.broadcast.to(partyID).emit("playerLeave_socket", user.name);
            console.log(`${chalk.red(`${chalk.underline(`Leave party`)}: ${user.name} from party ${partyID}`)}\n`);
        })
    });
 
    socket.on('disconnect', () => {
        console.log(`${chalk.bgRed(`Disconnected device: ${handshake}`)}\n`);
    });
    
});

http.listen(PORT, () => {
    console.log(`\n${chalk.blue(`>> Server listening on port ${PORT}`)}\n`);  
});
