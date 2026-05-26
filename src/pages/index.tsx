import { html } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";

export const indexPage = (): HtmlEscapedString => {
    return html`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ZSend Mail Logs</title>
    <link rel="stylesheet" href="https://unpkg.com/element-ui@2.15.14/lib/theme-chalk/index.css">
    <style>
        body { margin: 0; background: #f5f7fa; }
        #app { min-height: 100vh; }
        .login-container {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .login-card {
            width: 400px;
        }
        .login-title {
            text-align: center;
            margin-bottom: 30px;
            color: #303133;
        }
        .header-bar {
            background: #409eff;
            color: white;
            padding: 14px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .header-title { font-size: 18px; font-weight: bold; }
        .main-content { padding: 20px; }
        .search-bar {
            margin-bottom: 20px;
            display: flex;
            gap: 10px;
        }
        .pagination-bar {
            margin-top: 20px;
            display: flex;
            justify-content: flex-end;
        }
    </style>
</head>
<body>
    <div id="app">
        <!-- Login View -->
        <div v-if="!authenticated" class="login-container">
            <el-card class="login-card">
                <h2 class="login-title">ZSend Mail Logs</h2>
                <el-form @submit.native.prevent="handleLogin">
                    <el-form-item label="Token">
                        <el-input
                            v-model="token"
                            type="password"
                            placeholder="Enter your token"
                            show-password
                            @keyup.enter.native="handleLogin"
                        ></el-input>
                    </el-form-item>
                    <el-form-item>
                        <el-button
                            type="primary"
                            :loading="loginLoading"
                            @click="handleLogin"
                            style="width: 100%;"
                        >Login</el-button>
                    </el-form-item>
                </el-form>
            </el-card>
        </div>

        <!-- Logs View -->
        <div v-else>
            <div class="header-bar">
                <span class="header-title">ZSend Mail Logs</span>
                <el-button type="text" style="color: white;" @click="handleLogout">Logout</el-button>
            </div>
            <div class="main-content">
                <div class="search-bar">
                    <el-input
                        v-model="searchEmail"
                        placeholder="Search by email"
                        clearable
                        @clear="handleClearSearch"
                        @keyup.enter.native="fetchLogs"
                        style="width: 300px;"
                    ></el-input>
                    <el-button type="primary" @click="fetchLogs" :loading="loading">Search</el-button>
                </div>

                <el-table :data="logs" border stripe style="width: 100%">
                    <el-table-column prop="created_at" label="Time" width="180">
                        <template slot-scope="scope">
                            {{ formatDate(scope.row.created_at) }}
                        </template>
                    </el-table-column>
                    <el-table-column prop="from_email" label="From" width="200" show-overflow-tooltip></el-table-column>
                    <el-table-column prop="to_email" label="To" width="200" show-overflow-tooltip></el-table-column>
                    <el-table-column prop="subject" label="Subject" show-overflow-tooltip></el-table-column>
                    <el-table-column prop="status" label="Status" width="100">
                        <template slot-scope="scope">
                            <el-tag :type="scope.row.status === 'success' ? 'success' : 'danger'" size="small">
                                {{ scope.row.status }}
                            </el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column prop="mail_type" label="Type" width="100"></el-table-column>
                    <el-table-column prop="content_text" label="Content" min-width="200">
                        <template slot-scope="scope">
                            <el-tooltip v-if="scope.row.content_text" placement="top" :open-delay="300">
                                <div slot="content" style="max-width: 400px; word-break: break-all;">{{ scope.row.content_text }}</div>
                                <span>{{ scope.row.content_text.length > 50 ? scope.row.content_text.substring(0, 50) + '...' : scope.row.content_text }}</span>
                            </el-tooltip>
                        </template>
                    </el-table-column>
                    <el-table-column prop="request_ip" label="IP" width="140"></el-table-column>
                </el-table>

                <div class="pagination-bar">
                    <el-pagination
                        background
                        layout="total, prev, pager, next, sizes"
                        :total="total"
                        :page-size="pageSize"
                        :current-page.sync="currentPage"
                        :page-sizes="[10, 20, 50, 100]"
                        @current-change="handlePageChange"
                        @size-change="handleSizeChange"
                    ></el-pagination>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/vue@2.7.16/dist/vue.min.js"></script>
    <script src="https://unpkg.com/element-ui@2.15.14/lib/index.js"></script>
    <script src="https://unpkg.com/element-ui@2.15.14/lib/umd/locale/en.js"></script>
    <script>
        ELEMENT.locale(ELEMENT.lang.en);
        new Vue({
            el: '#app',
            data: function() {
                return {
                    authenticated: false,
                    token: '',
                    loginLoading: false,
                    searchEmail: '',
                    logs: [],
                    total: 0,
                    currentPage: 1,
                    pageSize: 20,
                    loading: false,
                };
            },
            mounted: function() {
                var savedToken = sessionStorage.getItem('zsend_token');
                if (savedToken) {
                    this.token = savedToken;
                    this.verifyToken(savedToken);
                }
            },
            methods: {
                verifyToken: function(token) {
                    var self = this;
                    fetch('/api/v1/auth', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token: token }),
                    })
                    .then(function(res) { return res.json(); })
                    .then(function(data) {
                        if (data.code === 200) {
                            self.authenticated = true;
                            self.fetchLogs();
                        } else {
                            sessionStorage.removeItem('zsend_token');
                            self.token = '';
                        }
                    })
                    .catch(function() {
                        sessionStorage.removeItem('zsend_token');
                        self.token = '';
                    });
                },
                handleLogin: function() {
                    if (!this.token.trim()) {
                        this.$message.warning('Please enter a token');
                        return;
                    }
                    var self = this;
                    self.loginLoading = true;
                    fetch('/api/v1/auth', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token: self.token }),
                    })
                    .then(function(res) { return res.json(); })
                    .then(function(data) {
                        if (data.code === 200) {
                            sessionStorage.setItem('zsend_token', self.token);
                            self.authenticated = true;
                            self.$message.success('Login successful');
                            self.fetchLogs();
                        } else {
                            self.$message.error(data.msg || 'Invalid token');
                        }
                    })
                    .catch(function() {
                        self.$message.error('Network error');
                    })
                    .finally(function() {
                        self.loginLoading = false;
                    });
                },
                handleLogout: function() {
                    sessionStorage.removeItem('zsend_token');
                    this.token = '';
                    this.authenticated = false;
                    this.logs = [];
                    this.total = 0;
                    this.currentPage = 1;
                },
                fetchLogs: function() {
                    var self = this;
                    self.loading = true;
                    var params = new URLSearchParams({
                        page: String(self.currentPage),
                        pageSize: String(self.pageSize),
                    });
                    if (self.searchEmail.trim()) {
                        params.set('email', self.searchEmail.trim());
                    }
                    fetch('/api/v1/logs?' + params.toString(), {
                        headers: { 'Authorization': 'Bearer ' + self.token },
                    })
                    .then(function(res) { return res.json(); })
                    .then(function(data) {
                        if (data.code === 200) {
                            self.logs = data.data.items;
                            self.total = data.data.total;
                        } else if (data.code === 401) {
                            self.$message.error('Session expired, please login again');
                            self.handleLogout();
                        } else {
                            self.$message.error(data.msg || 'Failed to fetch logs');
                        }
                    })
                    .catch(function() {
                        self.$message.error('Network error');
                    })
                    .finally(function() {
                        self.loading = false;
                    });
                },
                handlePageChange: function(page) {
                    this.currentPage = page;
                    this.fetchLogs();
                },
                handleSizeChange: function(size) {
                    this.pageSize = size;
                    this.currentPage = 1;
                    this.fetchLogs();
                },
                handleClearSearch: function() {
                    this.currentPage = 1;
                    this.fetchLogs();
                },
                formatDate: function(dateStr) {
                    if (!dateStr) return '';
                    var d = new Date(dateStr);
                    var year = d.getFullYear();
                    var month = String(d.getMonth() + 1).padStart(2, '0');
                    var day = String(d.getDate()).padStart(2, '0');
                    var hours = String(d.getHours()).padStart(2, '0');
                    var minutes = String(d.getMinutes()).padStart(2, '0');
                    var seconds = String(d.getSeconds()).padStart(2, '0');
                    return year + '-' + month + '-' + day + ' ' + hours + ':' + minutes + ':' + seconds;
                },
            },
        });
    </script>
</body>
</html>`;
};
