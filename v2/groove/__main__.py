import uvicorn

if __name__=='__main__':
    uvicorn.run('groove.app:app',host='127.0.0.1',port=8765,access_log=False)
