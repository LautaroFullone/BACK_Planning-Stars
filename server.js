const chalk = require('chalk'); 
const { Console } = require('console');
const PORT = 3000;

const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);

/*  TODO:
    - the server.js way of work should change
    - now, when socket is connected, we are going to add a variable name 'planningData'
    were all neccesary informastion about himseft would be stored. Example:
    socket {
        "planningData" = {
            "user" = {
                "id": 1,
                "name": 'Lauti Dev',
                "email": '***@gmail.com',
                "password": '*****'
            }
            "onParty" = '13ADFA';
            "moreInfo" = 'additional data'
        }
    }
    - the way of get the list of user connected also is goiung to change
    - now we can get sokets id's from party with > let sokets = io.sockets.adapter.rooms[partyID].sockets < 
    and then, for each socket we can get all his data doing this > let data = io.sockets.connected[socketID].planningData; 
    - the method will function like this: 
        let list = Object.keys(io.sockets.adapter.rooms[partyID].sockets);
        list.forEach( element => {
            console.log(io.sockets.connected[element].planningData )
        })
*/

io.on("connection", (socket) => {  
    const handshake = socket.id;

    console.log(`${chalk.bgGreen(`Connected device: ${handshake}`)}\n`);
 
    socket.on("joinParty", (data) => {
        let partyID = data.party; let user = data.user;

        socket.join(partyID, () => {            
            socket.emit("actualPlayerJoin_socket", user); //event to player that's joining
            socket.broadcast.to(partyID).emit("playerJoin_socket", user);  //event to rest of players (except joinning player)
            addDataToSocket(partyID, socket, user);
            io.to(partyID).emit("partyPlayers_socket", getPartyPlayers(partyID));

            if(getSelectedUS(partyID))
                sendSelectedUS(socket)

            console.log(`${chalk.green(`${chalk.underline(`Join party`)}: ${user.name} on ${partyID}`)}\n`); 
        });
    });

    socket.on('selectUS', (data) => {
        let userStory = data.us;
        setSelectedUS(userStory, socket.onParty);
        sendSelectedUS(socket);
    });

    socket.on('playerVotation', (data) => { 
        let votation = data.votation;

        socket.broadcast.to(socket.onParty).emit("playerVotation_socket", votation);
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

function sendSelectedUS(socket) {
    io.to(socket.onParty).emit("selectedUS_socket", getSelectedUS(socket.onParty))
}

function setSelectedUS(userStory, partyID){
    io.sockets.adapter.rooms[partyID].selectedUS = userStory;
}

function getSelectedUS(partyID) {
    if (io.sockets.adapter.rooms[partyID])
        return io.sockets.adapter.rooms[partyID].selectedUS;
}


function addDataToSocket(partyID, socket, userData){
    io.sockets.adapter.rooms[partyID].sockets[socket.id] = userData; 
    socket.user = userData;
    socket.onParty = partyID;
    /*
        socket.planningData = {};
        socket.planningData.user = userData;
        socket.planningData.onParty = partyID;
    */
}

function getPartyPlayers(partyID){
    if(io.sockets.adapter.rooms[partyID])
        return io.sockets.adapter.rooms[partyID].sockets
} 

function deleteSocketFromParty(socket){
    socket.leave(socket.onParty, () => {
        io.to(socket.onParty).emit("partyPlayers_socket", getPartyPlayers(socket.onParty));
        socket.broadcast.to(socket.onParty).emit("playerLeave_socket", socket.user);
    })
}