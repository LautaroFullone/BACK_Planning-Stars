const app = require('express')();
const http = require('http').Server(app);
// const io = require('socket.io')(http);
const io = require("socket.io")(http, {
    cors: {
        origin: "https://planningstar.vercel.app",
        methods: ["GET", "POST", "PUT"]
    }
});
const chalk = require('chalk');

const PORT = 3000;



io.on("connection", (socket) => {
    const handshake = socket.id;

    socket.planningData = {};

    console.log(`${chalk.bgGreen(`Connected device: ${handshake}`)}\n`);

    socket.on("hasUserAccess", (data) => {
        let userJoining = data.user;
        let partyID = data.party.id;
        let partyOwnerID = data.party.partyOwnerId;
        let partySize = data.party.maxPlayer;
        
        let isUserPartyOwner = (partyOwnerID == userJoining.id)
        socket.planningData.isOwner = isUserPartyOwner;

        if(isUserPartyOwner){
            socket.emit('hasUserAccess_socket', { hasAccess: true, isOwner: true,
                                                  reason: 'User is the admin' })

            addDataToSocket(socket, partyID, userJoining)
        }
        else {
            let socketsData = getSocketsFromParty(partyID)

            if(socketsData) {
                let isAdminConnected = socketsData.find(item => item.isOwner == true);

                if(isAdminConnected) { 

                    let actualSize = getCountPlayers(partyID);
                    if(actualSize + 1 <= partySize){
                        socket.emit('hasUserAccess_socket', { hasAccess: true, isOwner: false,
                                                              reason: 'Admin is connected' })

                        addDataToSocket(socket, partyID, userJoining)
                    }
                    else {
                        socket.emit('hasUserAccess_socket', { hasAccess: false, isOwner: false,
                                                              reason: 'The party size is completed'
                        })
                    }
                    
                }
                else
                    socket.emit('hasUserAccess_socket', { hasAccess: false, isOwner: false,
                                                          reason: 'Admin is not connected, please wait' })                 
            }
        }
    })

    socket.on('isUserPartyOwner', () => {
        let isOwner = socket.planningData.isOwner;
        socket.emit("userPartyOwner_socket", isOwner);
    })

    socket.on("joinParty", (data) => {
        let partyID = data.party;
        let userJoining = data.user;

        socket.join(partyID, () => {
            io.to(partyID).emit("playerJoin_socket", userJoining);
            
            let socketsData = getSocketsFromParty(partyID)
            
            //this only is needed to owner, it waits 0,5 second becase component loads after this event is emitted
            setTimeout(() => { io.to(partyID).emit("partyPlayers_socket", socketsData) }, 500);
            
            socket.emit("userPartyOwner_socket", socket.planningData.isOwner);

            console.log(`${chalk.green(`${chalk.underline(`Join party`)}: ${userJoining.name} on ${partyID}`)}\n`);
        }) 
    });
    
    socket.on('isSocketConnected', () => {
        let isConnected = socket.connected;
        socket.emit("socketConnected_socket", isConnected);
    })

    socket.on('planningStarted', (data) => {
        let userStory = data.us;
        let partyID = socket.planningData.onParty;

        io.to(partyID).emit("planningStarted_socket", userStory);
    })

    socket.on('plannigConcluded', (data) => {
        let partyID = socket.planningData.onParty;

        io.to(partyID).emit("plannigConcluded_socket", data);
    })
    
    socket.on('partyPlayers', () => { 
        let partyID = socket.planningData.onParty;
        let socketsData = getSocketsFromParty(partyID)

        io.to(partyID).emit("partyPlayers_socket", socketsData);
    });

    socket.on('playerVotation', (data) => {
        let votation = data.votation;
        
        let dataInfo = {    
            userID: votation.userID, 
            votation: {
                hasVote: true, 
                value: votation.value
            }    
        }

        socket.planningData.votation = dataInfo.votation;

        socket.broadcast.to(socket.planningData.onParty).emit("playerVotation_socket", dataInfo);
    });

    socket.on('leaveParty', () => { 
        if (!isObjEmpty(socket.planningData)) {
            let partyID = socket.planningData.onParty; 
            let user = socket.planningData.user;

            deleteSocketFromParty(socket)

            console.log(`${chalk.red(`${chalk.underline(`Leave party`)}: ${user.name} from party ${partyID}`)}\n`);
        }
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

function addDataToSocket(socket, partyID, user) {
    socket.planningData.onParty = partyID;
    socket.planningData.user = user;
    socket.planningData.votation = { hasVote: false };
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

function getCountPlayers(partyID) {
    let cant = 0;

    if (io.sockets.adapter.rooms[partyID])
        cant = io.sockets.adapter.rooms[partyID].length;

    return cant;
}

function isObjEmpty(obj) {
    return Object.keys(obj).length === 0;
}

function deleteSocketFromParty(socket) {
    
    if(!isObjEmpty(socket.planningData)) {
        let partyID = socket.planningData.onParty;
        let isSocketOwner = socket.planningData.isOwner;

        socket.leave(partyID, () => {
            let socketsData = getSocketsFromParty(partyID)

            io.to(partyID).emit("partyPlayers_socket", socketsData);

            if(socket.planningData.isOwner){
                socket.broadcast.to(partyID).emit("adminLeave_socket", { user: socket.planningData.user });
            }
            else {
                if (!isSocketOwner) //if admin left do not send this notification
                    socket.broadcast.to(partyID).emit("playerLeave_socket", { user: socket.planningData.user,
                                                                              isOwner: isSocketOwner });
            }     
            socket.planningData = {};
        })
    }
}
