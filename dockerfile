FROM node:18-alpine

# 設定工作目錄
WORKDIR /usr/local/app

# 先將 package.json 和 package-lock.json 複製到工作目錄
COPY package*.json ./

# 安裝依賴
RUN npm install

# 設定環境變數
# ENV MONGODB_URL=mongodb://localhost:27017/mydatabase

# 將應用的其他文件複製到工作目錄
COPY . .

# 暴露端口
EXPOSE 3000

# 設定啟動命令
CMD ["npm", "start"]