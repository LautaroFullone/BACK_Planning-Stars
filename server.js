const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const chalk = require('chalk');

const PORT = 3000;

io.on("connection", (socket) => {
    const handshake = socket.id;
    let lastDisconnected = undefined;

    socket.planningData = {};

    console.log(`${chalk.bgGreen(`Connected device: ${handshake}`)}\n`);

    socket.on("joinParty", (data) => {
        let partyID = data.party;
        let userJoining = data.user;
        let isOwner = data.isOwner;

                
        if(isOwner) {
            connectSocketIntoParty(socket, partyID, userJoining, true);
            setPartyOwnerID(partyID, userJoining.Id)

            socket.emit("hasUserAccess_socket", { hasAccess: true, isOwner: true});
        }
        else { 
            let socketsData = getSocketsFromParty(partyID)

            if(socketsData){
                let isAdminConnected = socketsData.find(item => item.isOwner == true);

                if(isAdminConnected){
                    connectSocketIntoParty(socket, partyID, userJoining, false);
                    socket.emit("hasUserAccess_socket", { hasAccess: true, isOwner: false });          
                }
                else{
                    socket.emit("hasUserAccess_socket", { hasAccess: false, reason:'Admin is not connected, please wait' });
                }
            }
        }      
    });
    
    socket.on('isUserPartyOwner', () => {
        let isOwner = socket.planningData.isOwner;
        socket.emit("userPartyOwner_socket", isOwner);
    })
   
    socket.on('selectUS', (data) => {  //i think it's not necessary anymore to have a method to set/get US
        let userStory = data.us;

        setSelectedUS(userStory, socket.planningData.onParty);
    
        io.to(socket.planningData.onParty).emit("selectedUS_socket", userStory);
    });

    socket.on('partyPlayers', (data) => { 
        let partyID = data.party; 
        let socketsData = getSocketsFromParty(partyID)

        io.to(partyID).emit("partyPlayers_socket", socketsData);
    });

    socket.on('playerVotation', (data) => {
        let votation = data.votation;

        socket.broadcast.to(socket.planningData.onParty).emit("playerVotation_socket", votation);
    });

    socket.on('leaveParty', (data) => {  //si el admin se va, este se llama muchas veces
        let partyID = data.party; let user = data.user;
        let adminLeave = data.adminLeave;

        deleteSocketFromParty(socket, adminLeave)

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
function connectSocketIntoParty(socket, partyID, userJoining, isOwner) {
    console.log('connecting', userJoining.name);
    
    socket.join(partyID, ()=> {
        addDataToSocket(socket, partyID, userJoining, isOwner);

        let socketsData = getSocketsFromParty(partyID)

        io.to(socket.planningData.onParty).emit("partyPlayers_socket", socketsData);
        io.to(socket.planningData.onParty).emit("playerJoin_socket", userJoining);
        //console.log('sockets to emit joining', socketsData);

        console.log(`${chalk.green(`${chalk.underline(`Join party`)}: ${userJoining.name} on ${partyID}`)}\n`);
    })
    console.log('test');
}

function addDataToSocket(socket, partyID, user, isOwner) {
    socket.planningData = {
        onParty: partyID,
        user: user,
        hasVote: false,
        isOwner: isOwner
    };
}

function getSocketsFromParty(partyID) {
    let socketsDatalist = new Array();

    if (io.sockets.adapter.rooms[partyID]) {
        let socketsIDList = Object.keys(io.sockets.adapter.rooms[partyID].sockets);

        socketsIDList.forEach(socketID => {
            let dataToInsert = io.sockets.connected[socketID].planningData;
            
            if(dataToInsert)
                socketsDatalist.push(dataToInsert)
        })
    }
    return socketsDatalist;
}

function setPartyOwnerID(partyID, userID) {
    io.sockets.adapter.rooms[partyID].ownerUserID = userID;
}
function getPartyOwnerID(partyID) {
    if (io.sockets.adapter.rooms[partyID])
        return io.sockets.adapter.rooms[partyID].ownerUserID;
}

function setSelectedUS(userStory, partyID) {
    io.sockets.adapter.rooms[partyID].selectedUS = userStory;
}

function getSelectedUS(partyID) {
    if (io.sockets.adapter.rooms[partyID])
        return io.sockets.adapter.rooms[partyID].selectedUS;
}

function isObjEmpty(obj) {
    return Object.keys(obj).length === 0;
}

function deleteSocketFromParty(socket, adminLeave) {
    if (!isObjEmpty(socket.planningData)) {

        let partyID = socket.planningData.onParty;
        socket.leave(partyID, () => {
            let socketsData = getSocketsFromParty(partyID)

            io.to(partyID).emit("partyPlayers_socket", socketsData);

            if(socket.planningData.isOwner){
                socket.broadcast.to(partyID).emit("adminLeave_socket", { user: socket.planningData.user });
            }
            else{
                if (!adminLeave) //if admin left do not send this notification
                    socket.broadcast.to(partyID).emit("playerLeave_socket", { user: socket.planningData.user,
                                                                              isOwner: socket.planningData.isOwner });
            }     
            socket.planningData={};
        })
    }
}
