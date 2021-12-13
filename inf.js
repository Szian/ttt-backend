class Move{
    constructor() {
        this.row = -1;
        this.col = -1;
    }
}
 
class Solver {

    constructor(player, opponent) {
        this.player = player;
        this.opponent = opponent;
    }

    isFull(board) {
        for (let i = 0; i < 3; i++)
            for (let j = 0; j < 3; j++)
                if (board[i][j] == '_')
                    return false;

        return true;
    }
    
    winner(board) {
        let rows = [[0, 0, 0], [0, 0, 0]]; // x, o
        let cols = [[0, 0, 0], [0, 0, 0]];
        let dias = [[0, 0], [0, 0]];
    
        let res = {
            ended: false,
            winner: ''
        };
    
        let blank = false;
        for (let i = 0; i < 3; i ++) {
            for (let j = 0; j < 3; j ++) {
                if (board[i][j] == '_') {
                    blank = true;
                    continue;
                };
                const t = board[i][j] == 'x' ? 0 : 1;
                rows[t][i] ++;
                cols[t][j] ++;
                if (i == j) dias[t][0] ++;
                if (i + j == 2) dias[t][1] ++;
            }
        }
    
        if (!blank) res.ended = true;
        for (let t = 0; t < 2; t ++) {
            let winner = t == 0 ? 'x' : 'o';
            let won = false;
            for (let i = 0; i < 3; i ++) {
                if (rows[t][i] == 3) won = true;
                if (cols[t][i] == 3) won = true;
            }
            if (dias[t][0] == 3 || dias[t][1] == 3) won = true;
            if (won) {
                res.ended = true;
                res.winner = winner;
                break;
            }
        }
    
        return res;
    }

    evaluate(board) {
        const res = this.winner(board);
        if (!res.ended || res.winner == '') return 0;

        if (res.winner == this.player) return 10;
        if (this.isFull(board)) return 0;

        

        return -10;
    }

    search(board, isMax) {
        const score = this.evaluate(board);
        if (score == 10 || score == -10) return score;
        if (this.isFull(board)) return 0;

        // backtracking

        if (isMax) {
            let max = -1000;
            for (let i = 0; i < 3; i ++) {
                for (let j = 0; j < 3; j ++) {
                    if (board[i][j] != '_') continue;
                    board[i][j] = this.player;
                    max = Math.max(max, this.search(board, false));
                    board[i][j] = '_';
                }
            }
            return max;
        }

        if (!isMax) {
            let min = 1000;
            for (let i = 0; i < 3; i ++) {
                for (let j = 0; j < 3; j ++) {
                    if (board[i][j] != '_') continue;
                    board[i][j] = this.opponent;
                    min = Math.min(min, this.search(board, true));
                    board[i][j] = '_';
                }
            }
            return min;
        }

        return 0;
    }

    findBestMove(board)
    {
        let bestScore = -1000;
        let bestMove = new Move();

        for (let i = 0; i < 3; i ++) {
            for (let j = 0; j < 3; j ++) {
                if (board[i][j] != '_') continue;
                board[i][j] = this.player;
                const score = this.search(board, false);
                if (score > bestScore) {
                    bestMove.row = i;
                    bestMove.col = j;
                    bestScore = score;
                }
                board[i][j] = '_';
            }
        }

        return bestMove;
    }
};

function solve(board, player, opponent) {
    let solver = new Solver(player, opponent);
    let res = {
        ended: false,
        winner: "",
        board: board
    }
    let status = solver.winner(board);
    res.ended = status.ended;
    res.winner = status.winner;
    if (res.ended) return res;

    let bestMove = solver.findBestMove(board);
    res.board[bestMove.row][bestMove.col] = player;
    status = solver.winner(board);
    res.ended = status.ended;
    res.winner = status.winner;
    return res;
}

module.exports = solve;
