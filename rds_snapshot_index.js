'use strict';

const AWS = require('aws-sdk');
const rds = new AWS.RDS();

// TZ��ύX
process.env.TZ = 'Asia/Tokyo'

// �����\�L��0�l��
const toDoubleDigits = function(num) {
  num += "";
  if (num.length === 1) {
    num = "0" + num;
  }
 return num;     
};

// �������擾
const today = new Date();
const year = ''+today.getFullYear().toString() ;
const month = ''+toDoubleDigits(today.getMonth()+1).toString();
const day = ''+toDoubleDigits(today.getDate()).toString();
const hour = ''+toDoubleDigits(today.getHours()).toString();
const minutes = ''+toDoubleDigits(today.getMinutes()).toString();
const seconds = ''+toDoubleDigits(today.getSeconds()).toString();


exports.handler = (event, context, callback) => {

    const generator  = (function *() {

        try {
            // �X�i�b�v�V���b�g���擾����Ώۂ�RDS�̃C���X�^���XID�����ϐ�����擾
            const dbId = process.env.dbId;

            // �X�i�b�v�V���b�g�ɕt�^���閼�O�̃v���t�B�b�N�X�����ϐ�����擾
            const prefix = process.env.prefix;
            
            // �o�b�N�A�b�v�ێ����㐔�����ϐ�����擾
            const retention = process.env.ENV_RETENTION;

            // �X�i�b�v�V���b�g���쐬
            yield createDBSnapshot(dbId, prefix, generator);

            // �X�i�b�v�V���b�g�̃��X�g���擾
            const snapshotsList = yield describeDBSnapshots(dbId, generator);

            // snapshot�̐����ێ����㐔�𒴂�����폜
            if(snapshotsList.length > retention ) {
                yield deleteDBSnapshot(snapshotsList[snapshotsList.length-1].DBSnapshotIdentifier, generator);
            }
            
            callback(null, 'success');

        } catch (e) {
            callback(e.message);
        }
    })();

    /* �����J�n */
    generator.next();

};

// RDS�X�i�b�v�V���b�g���쐬
function createDBSnapshot(dbId, prefix, generator) {

    const params = {
        DBInstanceIdentifier: dbId,
        DBSnapshotIdentifier: prefix+'-'+year+month+day+hour+minutes+seconds,
    };

    rds.createDBSnapshot(params, function(err, data) {
        if (err) {
            console.log(err, err.stack);
            generator.throw(new Error('create dbsnapshot error : ' + params.DBSnapshotIdentifier));
            return;
       }
       console.log('successful create dbsnapshot : ' + params.DBSnapshotIdentifier);
       generator.next();
    });
}


// �X�i�b�v�V���b�g�̃��X�g���擾
function describeDBSnapshots(dbId, generator) {

    const params = {
        DBInstanceIdentifier:  dbId,
    };

    rds.describeDBSnapshots(params, function(err, data) {
        if (err) {
            console.log(err, err.stack);
            generator.throw(new Error('describe DBsnapshots error'));
            return;
       }
       console.log('successful describe DBsnapshot');

       const snapshotsList = data.DBSnapshots;
       // �~���ɂȂ�т���
       snapshotsList.sort(function(a,b){
           let createDateA = new Date(a.StartTime);
           let createDateB = new Date(b.StartTime);

           if(createDateA.getTime() > createDateB.getTime()) {
               return -1;
           }
           if(createDateA.getTime() < createDateB.getTime()) {
               return 1;
           }
           return 0;
       });
       generator.next(snapshotsList);
    });
}

// snapshot���폜����
function deleteDBSnapshot(dbSnapshotIdentifier, generator) {

    const params = {
        DBSnapshotIdentifier: dbSnapshotIdentifier,
    };

    rds.deleteDBSnapshot(params, function(err, data) {
        if (err) {
            console.log(err, err.stack);
            generator.throw(new Error('delete dbsnapshot error : ' + params.deleteDBSnapshot));
            return;
       }
       console.log('successful delete dbsnapshot : ' + params.deleteDBSnapshot);
       generator.next();
    });
}
