import time
import pytest
from fastapi.testclient import TestClient
from groove.app import app


@pytest.fixture(scope='module')
def client():
    with TestClient(app) as c:yield c


def test_info_and_local_origin(client):
    assert client.get('/api/info').json()['version']=='0.2.0'
    assert client.post('/api/stop',headers={'Origin':'https://example.com'}).status_code==403


def test_generation_job_and_export(client):
    r=client.post('/api/generate',json={'budget':16,'taps':[{'beat':0}],'poly':{'mode':'ni_grid'}})
    assert r.status_code==202
    for _ in range(100):
        job=client.get('/api/jobs/'+r.json()['id']).json()
        if job['status']!='running':break
        time.sleep(.01)
    assert job['status']=='complete' and job['result']['archive']
    pattern=job['result']['candidates'][0]['pattern']
    exported=client.post('/api/export/midi',json=pattern)
    assert exported.status_code==200 and exported.content[:4]==b'MThd'


def test_invalid_requests_and_project(client):
    assert client.post('/api/generate',json={'budget':0}).status_code==422
    assert client.post('/api/generate',json={'engine':'cvae','role':'complement'}).status_code==400
    assert client.post('/api/record/tap',json={'timestamp':-100}).status_code==400
    assert client.post('/api/project/validate',json={'format':'other','version':1}).status_code==422
    assert client.post('/api/project/validate',json={'format':'2groove-v2','version':1,'taps':[{'beat':0}]}).status_code==200
