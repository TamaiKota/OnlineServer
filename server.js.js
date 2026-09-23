const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;

const wss = new WebSocket.WebSocketServer({
    port: PORT
});

const rooms = new Map();

console.log(
    "オンライン対戦サーバー起動: port " + PORT
);


// =========================================================
// 共通送信
// =========================================================

function send_message(ws, data) {

    if (
        ws &&
        ws.readyState === WebSocket.OPEN
    ) {
        ws.send(
            JSON.stringify(data)
        );
    }
}


// =========================================================
// ルームコード生成
// =========================================================

function create_room_code() {

    let code = "";

    do {

        code = Math.floor(
            100000 +
            Math.random() * 900000
        ).toString();

    } while (rooms.has(code));

    return code;
}


// =========================================================
// ルーム内の相手を取得
// =========================================================

function get_opponent(
    room,
    player
) {

    for (const other_player of room.players) {

        if (other_player !== player) {
            return other_player;
        }
    }

    return null;
}


// =========================================================
// クライアント接続
// =========================================================

wss.on(
    "connection",
    function connection(ws) {

        ws.room_code = "";
        ws.is_host = false;

        console.log(
            "クライアント接続"
        );


        // =====================================================
        // メッセージ受信
        // =====================================================

        ws.on(
            "message",
            function message(raw_data) {

                let data;

                try {

                    data = JSON.parse(
                        raw_data.toString()
                    );

                } catch (error) {

                    console.log(
                        "JSON解析失敗"
                    );

                    return;
                }

                if (!data || !data.type) {
                    return;
                }


                // =================================================
                // 部屋作成
                // =================================================

                if (
                    data.type ===
                    "create_room"
                ) {

                    if (ws.room_code !== "") {
                        return;
                    }

                    const room_code =
                        create_room_code();

                    const room = {
                        players: [
                            ws
                        ],
                        battle_started: false
                    };

                    rooms.set(
                        room_code,
                        room
                    );

                    ws.room_code =
                        room_code;

                    ws.is_host = true;

                    send_message(
                        ws,
                        {
                            "type":
                                "room_created",
                            "room_code":
                                room_code
                        }
                    );

                    console.log(
                        "部屋作成: " +
                        room_code
                    );

                    return;
                }


                // =================================================
                // 部屋参加
                // =================================================

                if (
                    data.type ===
                    "join_room"
                ) {

                    const room_code =
                        String(
                            data.room_code || ""
                        );

                    if (
                        room_code === ""
                    ) {
                        return;
                    }

                    const room =
                        rooms.get(
                            room_code
                        );

                    if (!room) {

                        send_message(
                            ws,
                            {
                                "type":
                                    "error",
                                "message":
                                    "部屋が見つかりません。"
                            }
                        );

                        return;
                    }

                    if (
                        room.players.length >= 2
                    ) {

                        send_message(
                            ws,
                            {
                                "type":
                                    "error",
                                "message":
                                    "この部屋は満員です。"
                            }
                        );

                        return;
                    }

                    room.players.push(
                        ws
                    );

                    ws.room_code =
                        room_code;

                    ws.is_host = false;

                    send_message(
                        ws,
                        {
                            "type":
                                "room_joined",
                            "room_code":
                                room_code
                        }
                    );


                    const host =
                        room.players[0];

                    send_message(
                        host,
                        {
                            "type":
                                "opponent_joined"
                        }
                    );

                    console.log(
                        "部屋参加: " +
                        room_code
                    );

                    return;
                }


               // =================================================
// バトル開始
// =================================================

if (
    data.type ===
    "battle_start"
) {

    const room =
        rooms.get(
            ws.room_code
        );

    if (!room) {
        return;
    }

    if (
        room.players.length !== 2
    ) {
        return;
    }

    if (
        room.battle_started
    ) {
        return;
    }

    room.battle_started = true;

    // -------------------------------------------------
    // 先攻をランダム決定
    // -------------------------------------------------

    const first_player_index =
        Math.floor(
            Math.random() * 2
        );

    // -------------------------------------------------
    // それぞれに「自分が先攻か」を送る
    // -------------------------------------------------

    for (
        let i = 0;
        i < room.players.length;
        i++
    ) {

        const player =
            room.players[i];

        const is_first_player =
            i === first_player_index;

        send_message(
            player,
            {
                "type":
                    "first_player",

                "is_host":
                    is_first_player
            }
        );
    }

    console.log(
        "先攻決定: " +
        (
            first_player_index === 0
            ? "ホスト"
            : "参加者"
        )
    );

    return;
}

                // =================================================
                // デッキ情報
                // =================================================

                if (
                    data.type ===
                    "battle_setup"
                ) {

                    const room =
                        rooms.get(
                            ws.room_code
                        );

                    if (!room) {
                        return;
                    }

                    const opponent =
                        get_opponent(
                            room,
                            ws
                        );

                    if (!opponent) {
                        return;
                    }

                    send_message(
                        opponent,
                        {
                            "type":
                                "battle_setup",
                            "main_1_id":
                                data.main_1_id || "",
                            "main_2_id":
                                data.main_2_id || ""
                        }
                    );

                    return;
                }


                // =================================================
                // 行動中継
                // =================================================

                if (
                    data.type ===
                    "action"
                ) {

                    const room =
                        rooms.get(
                            ws.room_code
                        );

                    if (!room) {
                        return;
                    }

                    const opponent =
                        get_opponent(
                            room,
                            ws
                        );

                    if (!opponent) {
                        return;
                    }

                    send_message(
                        opponent,
                        {
                            "type":
                                "action",
                            "action_type":
                                data.action_type || "",
                            "data":
                                data.data || {}
                        }
                    );

                    return;
                }
            }
        );


        // =========================================================
        // 切断
        // =========================================================

        ws.on(
            "close",
            function close() {

                console.log(
                    "クライアント切断"
                );

                if (
                    ws.room_code === ""
                ) {
                    return;
                }

                const room =
                    rooms.get(
                        ws.room_code
                    );

                if (!room) {
                    return;
                }

                const opponent =
                    get_opponent(
                        room,
                        ws
                    );

                if (opponent) {

                    send_message(
                        opponent,
                        {
                            "type":
                                "opponent_left"
                        }
                    );

                    opponent.room_code =
                        "";
                }

                rooms.delete(
                    ws.room_code
                );
            }
        );
    }
);


console.log(
    "WebSocket server listening on " +
    PORT
);