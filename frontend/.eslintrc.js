module.exports = {
    "env": {
        "browser": true,
        "es2021": true
    },
    "extends": "plugin:vue/essential",
    "parserOptions": {
        "ecmaVersion": 12,
        "parser": "@typescript-eslint/parser",
        "sourceType": "module"
    },
    "plugins": [
        "vue/vue3-essential",
        "@typescript-eslint"
    ],
    "settings":{
        "vue" : {
            version: "detect"
        }
    },
    "rules": {
    }
    
};
