const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const chalk = require('chalk');

const PORT = 3000;

io.on("connection", (socket) => {
    const handshake = socket.id;

    console.log(`${chalk.bgGreen(`Connected device: ${handshake}`)}\n`);

    socket.on("joinParty", (data) => {
        let partyID = data.party;
        let userJoining = data.user;
        let isOwner = data.isOwner;

        socket.join(partyID, () => {
            io.to(partyID).emit("playerJoin_socket", userJoining);

            addDataToSocket(socket, partyID, userJoining, isOwner);

            let socketsData = getSocketsFromParty(partyID)

            io.to(partyID).emit("partyPlayers_socket", socketsData);

            console.log(`${chalk.green(`${chalk.underline(`Join party`)}: ${userJoining.name} on ${partyID}`)}\n`);
        });
    });

    socket.on('selectUS', (data) => {  // i think it's not necessary anymore to have a method to set/get US
        let userStory = data.us;

        setSelectedUS(userStory, socket.planningData.onParty);

        io.to(socket.planningData.onParty).emit("selectedUS_socket", userStory);
    });

    socket.on('playerVotation', (data) => {
        let votation = data.votation;

        socket.broadcast.to(socket.planningData.onParty).emit("playerVotation_socket", votation);
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
            socketsDatalist.push(io.sockets.connected[socketID].planningData)
        })
    }
    return socketsDatalist;
}

function setSelectedUS(userStory, partyID) {
    io.sockets.adapter.rooms[partyID].selectedUS = userStory;
}

function getSelectedUS(partyID) {
    if (io.sockets.adapter.rooms[partyID])
        return io.sockets.adapter.rooms[partyID].selectedUS;
}

function deleteSocketFromParty(socket) {
    if (socket.planningData) {
        let partyID = socket.planningData.onParty;

        socket.leave(partyID, () => {
            let socketsData = getSocketsFromParty(partyID)

            io.to(partyID).emit("partyPlayers_socket", socketsData);

            socket.broadcast.to(partyID).emit("playerLeave_socket", socket.planningData.user);
        })
    }

}