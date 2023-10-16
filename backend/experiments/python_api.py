from flask import Flask

app = Flask(__name__)


@app.route('/python-endpoint', methods=['GET'])
def python_function():
    # Your Python code here
    result = "Hello from Python"
    return result


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3001)
