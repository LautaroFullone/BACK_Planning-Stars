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
            socket.emit("actualPlayerJoin_socket", user); //event to player that's joining
            socket.broadcast.to(partyID).emit("playerJoin_socket", user);  //event to rest of players (except joinning player)
            
            addDataToSocket(partyID, socket, user);
            sendPartyPlayerEvent(partyID);

            if(getSelectedUS(partyID))
                sendSelectedUS(socket, partyID, false)

            console.log(`${chalk.green(`${chalk.underline(`Join party`)}: ${user.name} on ${partyID}`)}\n`); 
        });
    });

    socket.on('selectUS', (data) => {
        let partyID = data.party; let userStory = data.us;
        setSelectedUS(userStory, partyID);
        sendSelectedUS(socket, partyID, true);
    });

    socket.on('leaveParty', (data) => {
        let partyID = data.party; let user = data.user;

        deleteSocketFromParty(socket)
        console.log(`${chalk.red(`${chalk.underline(`Leave party`)}: ${user.name} from party ${partyID}`)}\n`);
    });
 
    socket.on('disconnect', () => {
        deleteSocketFromParty(socket)
        console.log(`${chalk.bgRed(`Disconnected device: ${handshake}`)}\n`);
    });
    
});

http.listen(PORT, () => {
    console.log(`\n${chalk.blue(`>> Server listening on port ${PORT}`)}\n`);   
});

//-------------------------------------------------------------------------------

function sendSelectedUS(socket, partyID, isOwner) {
    if(isOwner)
        socket.broadcast.to(partyID).emit("selectedUS_socket", getSelectedUS(partyID));
    else
        socket.emit("selectedUS_socket", getSelectedUS(partyID));
}

function setSelectedUS(userStory, partyID){
    io.sockets.adapter.rooms[partyID].selectedUS = userStory;
}

function getSelectedUS(partyID) {
    return io.sockets.adapter.rooms[partyID].selectedUS;
}

function sendPartyPlayerEvent(partyID){
    io.to(partyID).emit("partyPlayers_socket", getPartyPlayers(partyID));
}

function addDataToSocket(partyID, socket, userData){
    io.sockets.adapter.rooms[partyID].sockets[socket.id] = userData; 
    socket.user = userData;
    socket.onParty = partyID;
}

function getPartyPlayers(partyID){
    if(io.sockets.adapter.rooms[partyID])
        return io.sockets.adapter.rooms[partyID].sockets
} 

function deleteSocketFromParty(socket){
    socket.leave(socket.onParty, () => {
        sendPartyPlayerEvent(socket.onParty);
        socket.broadcast.to(socket.onParty).emit("playerLeave_socket", socket.user);
    })
}