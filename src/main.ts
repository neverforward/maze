import * as mc from '@minecraft/server';

mc.world.afterEvents.chatSend.subscribe((e) => {
  const d = e.sender.dimension;
  const cmd = e.message.trim().split(" ");
  if (cmd.length > 0 && cmd[0] == '#maze') {
    type Point = [number, number];
    const WALL = '#', PATH = '.', ROUTE = '@';

    function createMaze(width: number = 21, height: number = 21): string[][] {
      const maze: string[][] = Array.from({ length: height }, () => Array(width).fill(WALL));
      const directions: Point[] = [[0, 1], [1, 0], [0, -1], [-1, 0]];

      function carve(x: number, y: number) {
        maze[y][x] = PATH;
        const shuffledDirections = shuffle(directions);
        for (let [dx, dy] of shuffledDirections) {
          const nx = x + dx * 2, ny = y + dy * 2;
          if (maze[ny]?.[nx] === WALL) {
            maze[y + dy][x + dx] = PATH;
            carve(nx, ny);
          }
        }

        const extraBranches = shuffle(directions).slice(0, Math.floor(Math.random() * directions.length));
        for (let [dx, dy] of extraBranches) {
          const nx = x + dx * 2, ny = y + dy * 2;
          if (maze[ny]?.[nx] === WALL && Math.random() > 0.7) {
            maze[y + dy][x + dx] = PATH;
            carve(nx, ny);
          }
        }
      }

      function shuffle<T>(array: T[]): T[] {
        for (let i = array.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
      }

      carve(1, 1);
      return maze;
    }

    function solveMaze(maze: string[][], start: Point, end: Point): string[][] {
      const queue: { pos: Point; dist: number }[] = [{ pos: start, dist: 0 }];
      const visited: Set<string> = new Set();
      visited.add(start.toString());
      const cameFrom: Map<string, Point> = new Map();

      while (queue.length > 0) {
        const { pos, dist } = queue.shift()!;
        if (pos[0] === end[0] && pos[1] === end[1]) {
          let currentPos = pos;
          while (currentPos[0] !== start[0] || currentPos[1] !== start[1]) {
            maze[currentPos[1]][currentPos[0]] = ROUTE;
            const from = cameFrom.get(currentPos.toString());
            if (from) {
              currentPos = from;
            }
          }
          break;
        }
        const moves = getNeighbors(maze, ...pos).filter(p => !visited.has(p.toString()));
        for (let move of moves) {
          visited.add(move.toString());
          cameFrom.set(move.toString(), pos);
          queue.push({ pos: move, dist: dist + 1 });
        }
      }
      return maze;
    }
    function getNeighbors(maze: string[][], x: number, y: number): Point[] {
      const directions: Point[] = [[0, 1], [1, 0], [0, -1], [-1, 0]];
      return directions.map(([dx, dy]) => [x + dx, y + dy] as Point)
        .filter(([nx, ny]) => maze[ny]?.[nx] === PATH || (nx === 19 && ny === 19));
    }

    const help = "\u00a7a语法: \u00a7f\u00a7l#maze\u00a7r \u00a77[width:number] [height:number] [path:boolean]\u00a7r\n" +
      "\u00a7a参数: \u00a7r\n" +
      " • width:  \u00a79number\u00a7f    指宽度, 默认为21\u00a7r" +
      "   - 范围: 2<width<24\n" +
      " • height: \u00a79number\u00a7f    指长度, 默认为21\u00a7r" +
      "   - 范围: 2<height<24\n\n" +
      " • path: \u00a79boolean\u00a7f     指是否启用最短路径, 默认为true\u00a7r" +
      "注: 如果width或height为偶数则返回width或height+1\n"


    let l = 21, w = 21, path = true;
    if (cmd.length >= 3) { // 确保有足够的参数
      if (!isNaN(Number(cmd[1])) && !isNaN(Number(cmd[2])) && Number(cmd[1]) <= 23 && Number(cmd[2]) <= 23) {
        l = Number(cmd[1]) % 2 == 0 ? Number(cmd[1]) + 1 : Number(cmd[1]);
        w = Number(cmd[2]) % 2 == 0 ? Number(cmd[2]) + 1 : Number(cmd[2]);
      }
      else {
        e.sender.sendMessage("\u00a7c参数类型或范围错误\n>> [width:number] [height:number] <<\u00a7r\n" +
          help
        );
        return;
      }

    }
    if (cmd.length >= 4) {
      if (cmd[3].toLocaleLowerCase() == 'true') path = true;
      else if (cmd[3].toLocaleLowerCase() == 'false') path = false;
      else {
        e.sender.sendMessage("\u00a7c参数错误\n>> [path:boolean] <<\u00a7r\n" + help)
        return;
      }

    }

    let maze = createMaze(l, w);
    if (path) {
      maze = solveMaze(maze, [1, 1], [l - 2, w - 2])
    }

    const x = e.sender.location.x,
      y = e.sender.location.y,
      z = e.sender.location.z;

    d.fillBlocks(new mc.BlockVolume({ x: x, y: y, z: z }, { x: x + l, y: y + 1, z: z + w }), "minecraft:air");
    d.fillBlocks(new mc.BlockVolume({ x: x, y: y - 1, z: z }, { x: x + l, y: y - 1, z: z + w }), "minecraft:smooth_stone");

    for (let i = 0; i < maze.length; i++) {
      for (let j = 0; j < maze[i].length; j++) {
        if (maze[i][j] == '#') {
          // 注意这里i和j的对应关系，可能需要根据实际情况调整
          d.getBlock({ x: x + j, y: y, z: z + i }).setType("minecraft:iron_block")
          d.getBlock({ x: x + j, y: y + 1, z: z + i }).setType("minecraft:iron_block")
        }
        else if (maze[i][j] == '@') {
          d.getBlock({ x: x + j, y: y - 1, z: z + i }).setType("minecraft:red_wool")
        }
      }
    }
    e.sender.tryTeleport({ x: x, y: y + 2, z: z });
    e.sender.sendMessage(`\u00a77\u00a7o[${e.sender.name}: 成功! 已在(${Math.trunc(x)},${Math.trunc(y)},${Math.trunc(z)})到(${Math.trunc(x + l)},${Math.trunc(y)},${Math.trunc(z + w)})处生成迷宫, ${path ? "包含" : "不包含"}最短路径]`)
  }
})

