
/* =========================================================
   APPARA CHESS
   FILE 19: move-history.js
   SECTION: js/chess/
   PURPOSE: Complete Chess Move History Manager
   ========================================================= */

import { EventBus, APP_EVENTS } from "../core/event-bus.js";


/* ---------------------------------------------------------
   1. MOVE HISTORY MANAGER
--------------------------------------------------------- */

export class MoveHistory {

  constructor(options = {}) {

    this.matchId = options.matchId || null;

    this.moves = [];

    this.events = [];

    this.startingFen = options.startingFen || null;

    this.result = "*";

    this.headers = {
      Event: "APPARA CHESS Match",
      Site: "APPARA CHESS",
      Date: new Date().toISOString().slice(0, 10),
      Round: "-",
      White: "White Player",
      Black: "Black Player",
      Result: "*"
    };

  }


  /* -------------------------------------------------------
     2. VALIDATE MOVE
  ------------------------------------------------------- */

  validateMove(move) {

    if (!move || typeof move !== "object") {
      return false;
    }

    if (
      typeof move.from !== "string" ||
      typeof move.to !== "string"
    ) {
      return false;
    }

    return true;
  }


  /* -------------------------------------------------------
     3. ADD MOVE
  ------------------------------------------------------- */

  addMove(move, metadata = {}) {

    if (!this.validateMove(move)) {
      return {
        success: false,
        error: "Invalid move data."
      };
    }

    const color = move.color === "b" ? "b" : "w";

    const moveNumber = Math.floor(this.moves.length / 2) + 1;

    const record = {

      id: this.moves.length + 1,

      moveNumber,

      color,

      from: move.from,

      to: move.to,

      san: move.san || "",

      lan: move.lan || `${move.from}-${move.to}`,

      uci: `${move.from}${move.to}${move.promotion || ""}`,

      piece: move.piece || null,

      captured: move.captured || null,

      promotion: move.promotion || null,

      flags: move.flags || "",

      isCapture: Boolean(move.captured),

      isPromotion: Boolean(move.promotion),

      isCheck: Boolean(metadata.isCheck),

      isCheckmate: Boolean(metadata.isCheckmate),

      fen: metadata.fen || null,

      timestamp: Date.now(),

      clock: metadata.clock
        ? { ...metadata.clock }
        : null,

      evaluation: metadata.evaluation ?? null

    };

    this.moves.push(record);

    this.addEvent("move", {
      moveId: record.id,
      moveNumber,
      color,
      san: record.san
    });

    if (record.isCapture) {
      this.addEvent("capture", {
        moveId: record.id,
        piece: record.captured
      });
    }

    if (record.isPromotion) {
      this.addEvent("promotion", {
        moveId: record.id,
        piece: record.promotion
      });
    }

    if (record.isCheck) {
      this.addEvent("check", {
        moveId: record.id,
        color
      });
    }

    if (record.isCheckmate) {
      this.addEvent("checkmate", {
        moveId: record.id,
        color
      });
    }

    return {
      success: true,
      move: this.getMove(record.id)
    };
  }


  /* -------------------------------------------------------
     4. ADD GAME EVENT
  ------------------------------------------------------- */

  addEvent(type, data = {}) {

    const event = {

      id: this.events.length + 1,

      type,

      timestamp: Date.now(),

      moveCount: this.moves.length,

      data: { ...data }

    };

    this.events.push(event);

    return event;
  }


  /* -------------------------------------------------------
     5. SET GAME HEADERS
  ------------------------------------------------------- */

  setHeaders(headers = {}) {

    const allowedHeaders = [
      "Event",
      "Site",
      "Date",
      "Round",
      "White",
      "Black",
      "Result",
      "WhiteElo",
      "BlackElo",
      "TimeControl"
    ];

    for (const key of allowedHeaders) {

      if (headers[key] !== undefined) {

        this.headers[key] = String(headers[key]);

      }

    }

    return {
      success: true,
      headers: this.getHeaders()
    };
  }


  /* -------------------------------------------------------
     6. SET GAME RESULT
  ------------------------------------------------------- */

  setResult(result, reason = "completed") {

    const validResults = ["1-0", "0-1", "1/2-1/2", "*"];

    if (!validResults.includes(result)) {
      return {
        success: false,
        error: "Invalid PGN result."
      };
    }

    this.result = result;

    this.headers.Result = result;

    this.addEvent("game-result", {
      result,
      reason
    });

    return {
      success: true,
      result
    };
  }


  /* -------------------------------------------------------
     7. GET SINGLE MOVE
  ------------------------------------------------------- */

  getMove(id) {

    const move = this.moves.find(item => item.id === id);

    return move ? structuredClone(move) : null;
  }


  /* -------------------------------------------------------
     8. GET ALL MOVES
  ------------------------------------------------------- */

  getMoves() {

    return structuredClone(this.moves);
  }


  /* -------------------------------------------------------
     9. GET MOVES BY COLOR
  ------------------------------------------------------- */

  getMovesByColor(color) {

    if (color !== "w" && color !== "b") {
      return [];
    }

    return structuredClone(
      this.moves.filter(move => move.color === color)
    );
  }


  /* -------------------------------------------------------
     10. GET CAPTURE HISTORY
  ------------------------------------------------------- */

  getCaptures() {

    return structuredClone(
      this.moves.filter(move => move.isCapture)
    );
  }


  /* -------------------------------------------------------
     11. GET PROMOTION HISTORY
  ------------------------------------------------------- */

  getPromotions() {

    return structuredClone(
      this.moves.filter(move => move.isPromotion)
    );
  }


  /* -------------------------------------------------------
     12. GET GAME EVENTS
  ------------------------------------------------------- */

  getEvents(type = null) {

    const result = type
      ? this.events.filter(event => event.type === type)
      : this.events;

    return structuredClone(result);
  }


  /* -------------------------------------------------------
     13. GET MOVE PAIRS
  ------------------------------------------------------- */

  getMovePairs() {

    const pairs = [];

    for (let i = 0; i < this.moves.length; i += 2) {

      const whiteMove = this.moves[i];

      const blackMove = this.moves[i + 1] || null;

      pairs.push({

        moveNumber: whiteMove.moveNumber,

        white: structuredClone(whiteMove),

        black: blackMove
          ? structuredClone(blackMove)
          : null

      });

    }

    return pairs;
  }


  /* -------------------------------------------------------
     14. GET HEADERS
  ------------------------------------------------------- */

  getHeaders() {

    return { ...this.headers };
  }


  /* -------------------------------------------------------
     15. GET HISTORY SUMMARY
  ------------------------------------------------------- */

  getSummary() {

    const captures = this.getCaptures();

    const promotions = this.getPromotions();

    return {

      matchId: this.matchId,

      totalMoves: this.moves.length,

      whiteMoves: this.getMovesByColor("w").length,

      blackMoves: this.getMovesByColor("b").length,

      totalCaptures: captures.length,

      totalPromotions: promotions.length,

      checks: this.events.filter(
        event => event.type === "check"
      ).length,

      checkmates: this.events.filter(
        event => event.type === "checkmate"
      ).length,

      result: this.result

    };
  }


  /* -------------------------------------------------------
     16. GENERATE PGN MOVES
  ------------------------------------------------------- */

  generateMoveText() {

    const pairs = this.getMovePairs();

    const output = [];

    for (const pair of pairs) {

      let line = `${pair.moveNumber}. ${pair.white.san}`;

      if (pair.black) {
        line += ` ${pair.black.san}`;
      }

      output.push(line);

    }

    return output.join(" ");
  }


  /* -------------------------------------------------------
     17. EXPORT PGN
  ------------------------------------------------------- */

  exportPGN() {

    const headers = Object.entries(this.headers)
      .map(([key, value]) => {
        const safeValue = String(value)
          .replace(/\\/g, "\\\\")
          .replace(/"/g, '\\"');

        return `[${key} "${safeValue}"]`;
      });

    const moveText = this.generateMoveText();

    const pgn = [
      ...headers,
      "",
      `${moveText} ${this.result}`.trim()
    ].join("\n");

    return pgn;
  }


  /* -------------------------------------------------------
     18. EXPORT HISTORY JSON
  ------------------------------------------------------- */

  exportJSON() {

    return JSON.stringify({

      matchId: this.matchId,

      startingFen: this.startingFen,

      headers: this.getHeaders(),

      moves: this.getMoves(),

      events: this.getEvents(),

      summary: this.getSummary(),

      result: this.result

    }, null, 2);
  }


  /* -------------------------------------------------------
     19. IMPORT HISTORY JSON
  ------------------------------------------------------- */

  importJSON(jsonData) {

    let data;

    try {

      data = typeof jsonData === "string"
        ? JSON.parse(jsonData)
        : jsonData;

    } catch {

      return {
        success: false,
        error: "Invalid JSON history."
      };

    }

    if (
      !data ||
      !Array.isArray(data.moves) ||
      !Array.isArray(data.events)
    ) {
      return {
        success: false,
        error: "History format is invalid."
      };
    }

    for (const move of data.moves) {

      if (!this.validateMove(move)) {
        return {
          success: false,
          error: "History contains an invalid move."
        };
      }

    }

    this.matchId = data.matchId || this.matchId;

    this.startingFen = data.startingFen || null;

    this.moves = structuredClone(data.moves);

    this.events = structuredClone(data.events);

    this.headers = {
      ...this.headers,
      ...(data.headers || {})
    };

    this.result = data.result || "*";

    return {
      success: true,
      summary: this.getSummary()
    };
  }


  /* -------------------------------------------------------
     20. CLEAR HISTORY
  ------------------------------------------------------- */

  clear() {

    this.moves = [];

    this.events = [];

    this.result = "*";

    this.headers.Result = "*";

    return {
      success: true
    };
  }


  /* -------------------------------------------------------
     21. HISTORY FACTORY
  ------------------------------------------------------- */

}


export function createMoveHistory(options = {}) {

  return new MoveHistory(options);

}


/* =========================================================
   FILE 19 END
   FILE: js/chess/move-history.js
   ========================================================= */
        
