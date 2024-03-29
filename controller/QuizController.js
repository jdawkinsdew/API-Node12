exports.setExcelAnswer = async function(req, res) {
    try {
        excelAnswers = req.body.excelAnswers
        userId = req.body.userId
        if (excelAnswers == undefined || userId == undefined) res.status(400).send()
        md5 = require('md5')
        businessId = md5(excelAnswers[0]['answer1'] + Date.now())
        for await (answer of excelAnswers) {
            header = 'u_id, profile, id_business_quiz, col_0_header'
            value = "'"+userId+"', 'business_profile', '"+answer['no']+"', '"+answer['answer0']+"'"
            for (i = 1; i < 8; i++) {
                if (answer['answer' + i] != undefined) {
                    header = header + ', col_' + i + '_header'
                    value = value + ", '"+answer['answer' + i]+"'"
                }
            }
            header = header + ', business_id'
            value = value + ", '" + businessId + "'"
            sql = "INSERT INTO tbl_business_answer (" + header + ") VALUES (" + value + ")"
            mysql.execute(sql)
        }
        global.countDone = 0
        global.setType = 'business'
        await setNewBusiness(businessId, userId)
        res.status(200).send()
    } catch {
        res.status(400).send()
    }
}

exports.getBusinessQuiz = async function(req, res) {
    try {
        provinceData = await mysql.execute("SELECT country, `names` FROM tbl_country_provinces  GROUP By `names` ORDER BY country ASC")
        if (req.body.profile == 'business_profile') {
            data = tbl_business_quiz
            result  = await mysql.execute("SELECT id_business_quiz, business_id FROM tbl_business_answer WHERE u_id = ? AND profile = 'business_profile' ORDER BY time_started DESC LIMIT 1", [req.body.userId])
            rememberData = result[0][0]
        } else {
            getProfileData = await mysql.execute("SELECT * FROM tbl_scout_profile WHERE userId = ?", [req.body.userId])
            data = getProfileData[0]
            rememberData  = undefined
        }
        quizData = {
            data: data,
            stakeholderRings: tbl_stakeholder_scoring,
            country: tbl_country_basic_information,
            instruments: tbl_instrument_types,
            currency_code: tbl_available_currency,
            stakeholder: tbl_stakeholder_map,
            goals: tbl_unsdg_database,
            balances: tbl_balance_sheet,
            incomes: tbl_income_sheet,
            cashFlows: tbl_cash_flow_sheet,
            sectors: tbl_sector_selection,
            goalInteractions: tbl_unsdg_goal_interactions,
            scoreBusiness: tbl_score_business,
            Municipalities: tbl_local_dist_muni,
            provinceList: provinceData[0],
            rememberValue: rememberData
        }
        res.status(200).send(quizData)
    } catch {
        res.status(400).send()
    }
}

exports.getScoutQuiz = async function(req, res) {
    try {
        if (req.body.profile == 'scouter_profile') {
            quizData = tbl_scout_quiz
        } else {
            result = await mysql.execute("SELECT * FROM tbl_scout_quiz WHERE (profile = ? OR PROFILE = 'All') AND scout_question_type = 'determine_ability'", [req.body.profile])
            quizData = result[0]
        }
        rememberData = await mysql.execute("SELECT id_business_quiz, business_id FROM tbl_business_answer WHERE u_id = ? AND (profile = ? OR profile = 'All') ORDER BY time_started DESC LIMIT 1", [req.body.userId, req.body.profile])
        quizData = {
            data: quizData,
            rememberValue: rememberData[0][0]
        }
        res.status(200).send(quizData)
    } catch {
        res.status(400).send()
    }
}

exports.setBusinessAnswer = async function(req, res) {
    try {
        receiveData = req.body
        if (receiveData.action == 'insert') {
            md5 = require('md5')
            businessId = md5(receiveData.questionTypeID)
        } else {
            businessId = receiveData.businessId
        }
        insertData = [businessId, receiveData.userid, receiveData.profile, receiveData.id_business_quiz]
        sql = 'INSERT INTO tbl_business_answer (business_id, u_id, profile, id_business_quiz'
        mark = ''
        if (receiveData.id_business_quiz == '2' && receiveData.profile == 'business_profile') {
            for (i = 0; i < req.files.length; i++) {
                sql += ', ' + 'col_' + i + '_header'
                insertData[i + 4] = req.files[i].filename
                mark += '?, '
            }
        } else if (receiveData.id_business_quiz == '50' && receiveData.profile == 'business_profile') {
            sql += ', col_0_header'; mark += '?, '
            if (req.files[0] != undefined) {
                sql += ', col_1_header'; mark += '?, '; insertData[4] = 'Yes'; insertData[5] = req.files[0].filename
            } else {
                insertData[4] = 'No'
            }
        } else {
            for (i = 0; i < 10; i++) {
                if (receiveData['col_' + i + '_header'] != undefined || receiveData['col_' + i + '_header'] != null) {
                    insertData[i + 4] = receiveData['col_' + i + '_header']
                    sql += ', ' + 'col_' + i + '_header'
                    mark += '?, '
                }
            }
        }
        sql += ') VALUES (' + mark + '?, ?, ?, ?)'
        await mysql.execute(sql, insertData)
        if (receiveData.profile == 'business_profile') {
            lastId = 134
        }
        else {
            if (receiveData.profile == 'scout_profile') {
                lastIdData = await mysql.execute("SELECT id FROM tbl_scout_quiz ORDER BY ID DESC LIMIT 1")
                lastId = lastIdData[0][0].id
            } else {
                lastIdData = await mysql.execute("SELECT id FROM tbl_scout_quiz WHERE profile = ? OR profile = 'All' ORDER BY ID DESC LIMIT 1", [receiveData.profile])
                lastId = lastIdData[0][0].id
            }
        }
        if (receiveData.id_business_quiz == lastId) {
            if (receiveData.profile == 'business_profile') {
                global.setType = 'business'
                global.countDone = 0
                await setNewBusiness(businessId, receiveData.userid)
                profileData = true
            }
            else {
                global.setType = 'business'
                profileData = await setNewProfile(businessId, receiveData.userid, receiveData.profile)
            }
            res.status(200).send(profileData)
        } else {
            res.status(200).send()
        }
    } catch (error) {
        res.status(400).send()
    }
}

exports.setScoutAnswer = async function(req, res) {
    try {
        receiveData = req.body
        if (receiveData.action == 'insert') {
            md5 = require('md5')
            scoutId = md5(receiveData.scoutId)
        } else {
            scoutId = receiveData.scoutId
        }
        insertData = [receiveData.userId, receiveData.profile, receiveData.businessId, receiveData.id, scoutId]
        sql = 'INSERT INTO tbl_scout_answer (u_id, profile, business_id, id_business_quiz, scout_id'
        mark = ''
        if (receiveData.id == '2' && receiveData.profile == 'Business_Profile') {
            sql += ', ' + 'col_0_header'
            insertData[5] = req.files[0].filename
            mark += '?, '
        } else if (receiveData.id == '50' && receiveData.profile == 'Business_Profile') {
            sql += ', col_0_header'; mark += '?, '
            if (req.files[0] != undefined) {
                sql += ', col_1_header'; mark += '?, '; insertData[5] = 'Yes'; insertData[6] = req.files[0].filename
            } else {
                insertData[5] = 'No'
            }
        } else {
            for (i = 0; i < 10; i++) {
                if (receiveData['col_' + i + '_header'] != undefined || receiveData['col_' + i + '_header'] != null) {
                    insertData[i + 5] = receiveData['col_' + i + '_header']
                    sql += ', ' + 'col_' + i + '_header'
                    mark += '?, '
                }
            }
        }
        sql += ') VALUES (' + mark + '?, ?, ?, ?, ?)'
        await mysql.execute(sql, insertData)
        if (receiveData.finish == 'true') {
            global.countDone = 0
            global.setType = 'scout'
            setNewScout(scoutId, receiveData.userId, receiveData.businessId)
        }
        res.status(200).send()
    } catch (error) {
        res.status(400).send()
    }
}

exports.getCompareQuiz = async function(req, res) {
    try {
        quizCompareData = new Array()
        sql = '';
        for (profile of req.body.profile) {
            sql += sql + "profile = "+ '\'' + profile + '\'' + " OR "
        }
        result = await mysql.execute("SELECT * FROM tbl_scout_quiz WHERE (" + sql + " profile = 'All') AND scout_question_type = 'field_operation'")
        for (data of result[0]) {
            insertData = {}
            count = 0
            insertData['questionId'] = data.id
            insertData['notes'] = data.notes
            insertData['profile'] = data.profile
            insertData['required'] = data.required
            if (data.notes === 'Dom manipulation required') {
                insertData['col_' + count + '_header'] = data['col_0_header']
                insertData['col_' + count] = data['col_0']
                count++
                for (i = 1; i < 10; i++) {
                    if (data['col_' + i + '_header'] != '') {
                        insertData['col_' + count + '_header'] = data['col_' + i + '_header']
                        insertData['col_' + count] = data['col_' + i]
                        count++
                    }
                }
            } else {
                for (i = 0; i < 10; i++) {
                    if (data['col_' + i + '_header'] != '') {
                        insertData['col_' + count + '_header'] = data['col_' + i + '_header']
                        insertData['col_' + count] = data['col_' + i]
                        count++
                    }
                }
            }
            quizCompareData.push(insertData)
        }
        sql = ''
        for (i = 0; i < 10; i++) {
            if (i != 5) {
                sql += "scout_col_" + i + "_header <>'0' OR "
            }
        }
        sql = sql.substring(0, sql.length - 4)
        result = await mysql.execute("SELECT * FROM tbl_business_quiz WHERE (" + sql + ") AND scout_question_type = 'field_operation'")
        for (data of result[0]) {
            insertData = {}
            count = 0
            insertData['questionId'] = data.id
            insertData['notes'] = data.notes
            insertData['profile'] = data.profile
            insertData['required'] = data.required
            insertData['domPosition'] = data.dom_position
            if (data.notes === 'Dom manipulation required') {
                insertData['col_' + count + '_header'] = data['col_0_header']
                insertData['col_' + count] = data['col_0']
                count++
                for (i = 1; i < 10; i++) {
                    if (data['col_' + i + '_header'] != '') {
                        insertData['col_' + count + '_header'] = data['col_' + i + '_header']
                        insertData['col_' + count] = data['col_' + i]
                        count++
                    }
                }
            } else {
                for (i = 0; i < 10; i++) {
                    if (data['scout_col_' + i + '_header']) {
                        insertData['col_' + count + '_header'] = data['col_' + i + '_header']
                        insertData['col_' + count] = data['col_' + i]
                        count++;
                    }
                }
            }
            quizCompareData.push(insertData)
        }
        result = await mysql.execute("SELECT scout_id FROM tbl_scout_answer WHERE u_id = ? AND business_id = ? ORDER BY time_started DESC LIMIT 1", [req.body.userId, req.body.businessId])
        if (result[0][0] == undefined) {
            length = 0
            scoutId = undefined
        } else {
            scoutId = result[0][0].scout_id
            result  = await mysql.execute("SELECT scout_id FROM tbl_scout_answer WHERE u_id = ? AND business_id = ? AND scout_id = ?", [req.body.userId, req.body.businessId, scoutId])
            length = result[0].length
            if (length == 0) {
                scoutId = undefined
            } else {
                scoutId = result[0][length - 1].scout_id
            }
        }
        rememberData = {id: length, scoutId: scoutId}
        quizData = {
            data: quizCompareData,
            stakeholderRings: tbl_stakeholder_scoring,
            country: tbl_country_basic_information,
            instruments: tbl_instrument_types,
            currency_code: tbl_available_currency,
            stakeholder: tbl_stakeholder_map,
            goals: tbl_unsdg_database,
            balances: tbl_balance_sheet,
            incomes: tbl_income_sheet,
            cashFlows: tbl_cash_flow_sheet,
            sectors: tbl_sector_selection,
            goalInteractions: tbl_unsdg_goal_interactions,
            scoreBusiness: tbl_score_business,
            Municipalities: tbl_local_dist_muni,
            provinceList: provinceData[0],
            rememberValue: rememberData
        }
        res.status(200).send(quizData)
    } catch {
        res.status(400).send()
    }
}

async function setNewProfile(profileId, userId, profile) {
    answers = await getAnswersByBusinessId(userId, businessId)
    country = await getAnswerByIdCol(42, 'col_1_header', answers)
    organisation = await getAnswerByIdCol(42, 'col_0_header', answers)
    province = await getAnswerByIdCol(42, 'col_2_header', answers)
    await mysql.execute("INSERT INTO tbl_scout_profile (userId, profileId, type, organisation, country, province) VALUES (?, ?, ?, ?, ?, ?)", [userId, profileId, profile, organisation, country, province])
    userProfile = await mysql.execute("SELECT * FROM tbl_scout_profile WHERE userId = ?", [userId])
    return userProfile[0]
}

async function getAnswersByBusinessId(userId, businessId) {
    try {
        if (setType == 'business') {
            result = await mysql.execute("SELECT * FROM tbl_business_answer WHERE u_id = ? AND business_id = ?", [userId, businessId])
            return result[0]
        } else {
            result = await mysql.execute("SELECT * FROM tbl_scout_answer WHERE u_id = ? AND scout_id = ? AND profile = 'Business_Profile'", [userId, businessId])
            return result[0]
        }
    } catch {
        return []
    }
}
async function insertNewTab(keyInfo, businessInfo, type, userId, businessId) {
    try {
        if (type == 'key') {
            for (const [i, key] of Object.entries(keyInfo)) {
                if (businessInfo[i] == undefined) {
                    businessInfo[i] = ''
                }
                if (setType == 'business') {
                    sql = "UPDATE tbl_business SET `" + key['description'].toLowerCase() + "` = ? WHERE u_id = ? AND business_id = ?"
                    insertData = [businessInfo[i], userId, businessId]
                    await mysql.execute(sql, insertData)
                } else {
                    if (key['description'].toLowerCase() != 'business name') {
                        sql = "UPDATE tbl_scout SET `" + key['description'].toLowerCase() + "` = ? WHERE u_id = ? AND scout_id = ?"
                        insertData = [businessInfo[i], userId, businessId]
                        await mysql.execute(sql, insertData)
                    }
                }
            }
        } else {
            for (const [key, data] of Object.entries(businessInfo)) {
                if (data == undefined) data = ''
                if (setType == 'business') {
                    sql = "UPDATE tbl_business SET `" + key + "` = ? WHERE u_id = ? AND business_id = ?"
                } else {
                    sql = "UPDATE tbl_scout SET `" + key + "` = ? WHERE u_id = ? AND scout_id = ?"
                }
                insertData = [data, userId, businessId]
                await mysql.execute(sql, insertData)
            }
        }
        countDone++
        if (countDone == 9 && setType == 'business') {
            global.countDone = 0
            result = await mysql.execute('SELECT * FROM tbl_business');
            global.tbl_business = result[0];
            global.stakeholders = await getStakeholders(tbl_business)
            global.extraData = await getData(tbl_business)
        }
    } catch { }
}


async function setNewBusiness(businessId, userId) {
    try {
        mysql.execute("INSERT INTO tbl_business (u_id, business_id) VALUES (?, ?)", [userId, businessId])
        answers = await getAnswersByBusinessId(userId, businessId)
        financialInformation(userId, businessId, answers)
        businessInformation(userId, businessId, answers)
        financialBalance(userId, businessId)
        financialIncome(userId, businessId, answers)
        financialCash(userId, businessId)
        scoringFinancial(answers, userId, businessId)
        badgeBusinessMunicipal(answers, userId, businessId, 'badge')
        sustainabilityUnSdg(userId, businessId, answers)
        sustainabilityStakeholderCountry(userId, businessId, answers)
        notification(userId, businessId)
    } catch { }
}

async function setNewScout(scoutId, userId, businessId) {
    try {
        mysql.execute("INSERT INTO tbl_scout (u_id, scout_id, business_id) VALUES (?, ?, ?)", [userId, scoutId, businessId])
        answers = await getAnswersByBusinessId(userId, scoutId)
        financialInformation(userId, scoutId, answers)
        businessInformation(userId, scoutId, answers)
        financialBalance(userId, scoutId)
        financialIncome(userId, scoutId, answers)
        financialCash(userId, scoutId)
        scoringFinancial(answers, userId, scoutId)
        badgeBusinessMunicipal(answers, userId, scoutId, 'badge')
        sustainabilityUnSdg(userId, scoutId, answers)
        sustainabilityStakeholderCountry(userId, scoutId, answers)
    } catch { }
}

async function getAnswerByIdCol(id, col, answers) {
    try {
        for await (answer of answers) {
            if (answer['id_business_quiz'] == id) {
                return answer[col]
            }
        }
    } catch {
        return 'none'
    }
}

async function getKeyFromCatalogue(inserData) {
    try {
        result = await mysql.execute("SELECT `description` FROM tbl_catalogue_summary WHERE tab = ? AND sub_tab = ? AND button_in_sub_tab = ?  AND tbl_pull_request_1_source = ?", inserData)
        return result[0]
    } catch {
        return []
    }
}

function getSum(answers, id, col, idCond, colCond, condition) {
    sum = 0
    for (answer of answers) {
        value = parseFloat(answer[col])
        if (isNaN(value)) value = 0
        if (condition != '') {
            if (idCond != '') {
                if (answer['id_business_quiz'] == idCond) {
                    if (answer[colCond] == condition) sum += value
                }
            } else {
                if (answer[col] == condition) sum += value
            }
        } else {
            if (answer['id_business_quiz'] == id) {
                if (answer[col] != null) {
                    if (answer[col].indexOf('between') != -1) sum = answer[col]
                    else sum += value
                }
            }
        }
    }
    if (isNaN(parseFloat(sum))) sum = 0
    return parseFloat(sum)
}

function getCount(id, answers) {
    count = 0
    for (answer of answers) {
        if (answer['id_business_quiz'] == id) count++
    }
    return count
}

async function getAnswerByQuery(keyInfo, businessId) {
    answers = new Array()
    for await (key of keyInfo) {
        for await (catalogue of tbl_catalogue_summary) {
            if (catalogue['description'] == key.description) {
                if (setType == 'business') {
                    sql = catalogue['tbl_pull_request_1'] + " AND business_id = '" + businessId + "'"
                    answer = await mysql.execute(sql)
                    if (answer[0][0] != undefined) answers.push(answer[0][0]['value'])
                    else answers.push('')
                } else {
                    sql = catalogue['tbl_pull_request_2'] + " AND scout_id = '" + businessId + "'"
                    answer = await mysql.execute(sql)
                    if (answer[0][0] != undefined) answers.push(answer[0][0]['value'])
                    else answers.push('')
                }
            }
        }
    }
    return answers
}

async function getAnswerById(answers, id) {
    answerById = new Array()
    for (answer of answers) {
        if (answer['id_business_quiz'] == id) answerById.push(answer)
    }
    return answerById
}

async function getNewArea(answers, col, area) {
    areaResult = ''
    for (answer of answers) {
        districts = rtrim(answer[col], ',').split(',')
        for (district of districts) {
            rows = district.split('!!')
            for (i = 0; i < rows.length; i++) {
                if ((area == 'district' && i == 0) || (area == 'municipality' && i == 1)) {
                    if (areaResult == '') areaResult = rows[i]
                    else areaResult += ',' + rows[i]
                }
            }
        }
    }
    return rtrim(areaResult, ',')
}

async function getMunicipalLink(goalNumber)
{
    result = await mysql.execute("SELECT `local_municipality_link` FROM `tbl_muni_measure` WHERE `unsdg_direct` = ?", [goalNumber])
    if(result[0]['local_municipality_link'] != undefined) {
        return result[0]['local_municipality_link']
    }
    return 'No Found Municipality link'
}

async function arrangeEachScoring(scoringAnswersById) {
    totalScoringData = new Array()
    for await (answers of scoringAnswersById) {
        for (answer of answers) {
            totalScoringData.push(answer)
        }
    }
    return totalScoringData
}

async function getScoreEachAnswer(eachAnswer, id, col) {
    scoreAnswer = new Array()
    for (score of tbl_score_business) {
        if (score['question_id'] == id && score['col_header'] == col && score['answer'] == '(Blank)') {
            if (eachAnswer != undefined) {
                scoreAnswer.push(score)
                break
            }
        } else {
            if (score['answer'] == eachAnswer) {
                scoreAnswer.push(score)
                break
            }
        }
    }
    return scoreAnswer
}

async function getScoringAnswersById(answerById, question, indexColId) {
    scoringData = new Array()
    for (col of indexColId) {
        for await (answer of answerById) {
            getDataValue = await getScoreEachAnswer(answer['col_' + col + '_header'], question, col)
            if (getDataValue != []) {
                scoringData.push(getDataValue)
            }
        }
    }
    return scoringData
}

async function getUniqueColsId(question) {
    temps = new Array()
    for (score of tbl_score_business) {
        if (score['question_id'] == question) {
            temps.push(score)
        }
    }
    colId = new Array()
    for (temp of temps) {
        colId.push(temp['col_header'])
    }
    return colId.filter((v, i, a) => a.indexOf(v) === i)
}

async function getScoringData(answers) {
    totalData = new Array()
    questionId = new Array()
    for (score of tbl_score_business) {
        questionId.push(score['question_id'])
    }
    questionId = questionId.filter((v, i, a) => a.indexOf(v) === i)
    for await (question of questionId) {
        indexColId = await getUniqueColsId(question)
        answersById = await getAnswerById(answers, question)
        scoringAnswersById = await getScoringAnswersById(answersById, question, indexColId)
        totalData.push(await arrangeEachScoring(scoringAnswersById))
    }
    return totalData
}

async function setLocation(userId, businessId, address) {
    NodeGeocoder = require('node-geocoder');
    options = {
        provider: 'google',
        apiKey: 'AIzaSyA6L4RK2RH8CmfPnyV1VEfjrHj3BP66gmE',
        formatter: null
    }
    geocoder = NodeGeocoder(options);
    geocoder.geocode(address)
        .then(function(geoData) {
            mysql.execute("UPDATE tbl_business SET lat = ?, lng = ? WHERE u_id = ? AND business_id = ?", [geoData[0].latitude, geoData[0].longitude, userId, businessId])
        })
        .catch(function(err) {
        })
}


async function notification(userId, businessId) {
    try {
        tables = await mysql.execute("SELECT u_id FROM tbl_user WHERE NOT u_id = ?", [userId])
        for (table of tables[0]) {
            await mysql.execute("INSERT INTO tbl_notification (userId, businessId) VALUES (?, ?)", [table['u_id'], businessId])
        }
    } catch { }
}

async function badgeBusinessMunicipal(answers, userId, businessId, action) {
    goalPath = ''
    municipal = ''
    businessInfo = new Array()
    goals = tbl_unsdg_database
    goalNameData = await getAnswerByIdCol(47, 'col_0_header', answers)
    goalNames = goalNameData.split(',')
    for (goalName of goalNames) {
        for (goal of goals) {
            if (goal['goal_name'] == goalName) {
                if (action == 'badge') {
                    if (goalPath != '') goalPath += ',' + goal['path']
                    else  goalPath = goal['path']
                } else if (action == 'Municipal') {
                    if (municipal != '') municipal += ',' + goal['goal_number']
                    else municipal = goal['goal_number']
                }
            }
        }
    }
    if (action == 'Municipal') return municipal
    businessInfo['badge name'] = goalPath
    insertNewTab('', businessInfo, 'query', userId, businessId)
}

async function scoringFinancial(answers, userId, businessId) {
    scoringDataList = new Array()
    keyScoring = await getKeyFromCatalogue(['Scoring Summary', 'Financial Scoring', '', 'tbl_business_answer&score_business'])
    scoringData = await getScoringData(answers)
    for (keys of keyScoring) {
        scoringDataList[keys['description']] = 0
        for (datas of scoringData) {
            for (data of datas) {
                if (parseFloat(data[keys['description'].toLowerCase()]) == NaN) data[keys['description'].toLowerCase()] = 0
                scoringDataList[keys['description']] += parseFloat(data[keys['description'].toLowerCase()])
            }
        }
    }
    insertNewTab('', scoringDataList, 'query', userId, businessId)
}

async function sustainabilityStakeholderCountry(userId, businessId, answers) {
    businessInfo = {
        country: await getAnswerByIdCol(6, 'col_1_header', answers),
        province: await getAnswerByIdCol(51, 'col_3_header', answers),
        district: await getNewArea(await getAnswerById(answers, 40), 'col_6_header', 'district'),
        municipality: await getNewArea(await getAnswerById(answers, 40), 'col_6_header', 'municipality'),
        municipality_link: await getMunicipalLink(await badgeBusinessMunicipal(answers, userId, businessId, 'Municipal'))
    }
    insertNewTab('', businessInfo, 'query', userId, businessId)
}

async function sustainabilityUnSdg(userId, businessId, answers) {
    businessInfo = new Array()
    businessInfo['goal name'] = await getAnswerByIdCol(47, 'col_0_header', answers)
    insertNewTab('', businessInfo, 'query', userId, businessId)
}

async function financialCash(userId, businessId) {
    keyCash = await getKeyFromCatalogue(['Financial Summary', 'Cash Flow Statement', '', 'tbl_business_answer'])
    if (setType == 'business') {
        insertNewTab(keyCash, await getAnswerByQuery(keyCash, businessId), 'key', userId, businessId)
    } else {
        insertNewTab(keyCash, await getAnswerByQuery(keyCash, businessId), 'key', userId, businessId)
    }
}

async function financialIncome(userId, businessId, answers) {
    businessInfo = []
    idAnswers = await getAnswerById(answers, 64)
    for (answer of idAnswers) {
        if (setType == 'business') {
            answer1 = answer['col_1_header']
            answer2 = answer['col_2_header']
        } else {
            answer1 = answer['col_0_header']
            answer2 = answer['col_1_header']
        }
        if (businessInfo['income items'] != undefined) {
            businessInfo['income items'] += ',' + answer1
            businessInfo['income amounts'] += ',' + answer2
        } else {
            businessInfo['income items'] = answer1
            businessInfo['income amounts'] = answer2
        }
    }
    insertNewTab('', businessInfo, 'query', userId, businessId)
}

async function financialBalance(userId, businessId) {
    balanceInfo = await getKeyFromCatalogue(['Financial Summary', 'Balance Sheet', '', 'tbl_business_answer'])
    if (setType == 'business') {
        insertNewTab(balanceInfo, await getAnswerByQuery(balanceInfo, businessId), 'key', userId, businessId)
    } else {
        insertNewTab(balanceInfo, await getAnswerByQuery(balanceInfo, businessId), 'key', userId, businessId)
    }
}

async function financialInformation(userId, businessId, answers) {
    keyFinancial = await getKeyFromCatalogue(['Financial Summary', 'Financial Information', '', 'tbl_business_answer'])
    sum30_1 = await getSum(answers, 30, 'col_1_header', '', '', '')
    sum31_4 = await getSum(answers, 31, 'col_4_header', '', '', '')
    sum32_1 = await getSum(answers, 32, 'col_1_header', '', '', '')
    sum40_9 = await getSum(answers, 40, 'col_9_header', '', '', '')
    sum56_0 = await getSum(answers, 56, 'col_0_header', '', '', '')
    sum56_5 = await getSum(answers, 56, 'col_5_header', '', '', '')
    sum56_7 = await getSum(answers, 56, 'col_7_header', '', '', '')
    sum56_9 = await getSum(answers, 56, 'col_9_header', '', '', '')
    sum57_1 = await getSum(answers, 57, 'col_1_header', '', '', '')
    sum57_2 = await getSum(answers, 57, 'col_2_header', '', '', '')
    sum57_3 = await getSum(answers, 57, 'col_3_header', '', '', '')
    sum57_4 = await getSum(answers, 57, 'col_4_header', '', '', '')
    sum57_6 = await getSum(answers, 57, 'col_6_header', '', '', '')
    sum57_7 = await getSum(answers, 57, 'col_7_header', '', '', '')
    sum57_8 = await getSum(answers, 57, 'col_8_header', '', '', '')
    sum57_9 = await getSum(answers, 57, 'col_9_header', '', '', '')
    sum61_2 = await getSum(answers, 61, 'col_2_header', '', '', '')
    sum62_2 = await getSum(answers, 62, 'col_2_header', '', '', '')
    if (setType == 'business') {
        sum46_1 = await getSum(answers, 46, 'col_1_header', '', '', '')
    } else {
        sum46_1 = 0
    }
    businessInfo = new Array()
    businessInfo.push(sum30_1)
    businessInfo.push(sum31_4 / getCount(31, answers))
    businessInfo.push((sum57_1 + sum57_1 + sum57_3) * 4)
    businessInfo.push((sum57_1 + sum57_1 + sum57_3) * 4 / sum61_2)
    businessInfo.push((sum57_1 + sum57_1 + sum57_3) * 4 / await getSum(answers, 61, 'col_2_header', 61, 'col_3_header', 'No'))
    businessInfo.push(sum57_8 / (sum40_9 * 12))
    businessInfo.push((sum40_9 + sum57_4 * 12 / await getSum(answers, 62, 'col_2_header', 61, 'col_3_header', 'Yes')))
    businessInfo.push((sum57_4 * 12 / (await getSum(answers, 62, 'col_2_header', 61, 'col_3_header', 'Yes'))))
    businessInfo.push((sum57_4 * 12 + sum57_9 * (sum57_1 + sum57_2 + sum57_3) * 4) / sum46_1)
    businessInfo.push(sum62_2 / (sum61_2 - sum62_2))
    businessInfo.push(sum62_2 / sum61_2)
    businessInfo.push(sum56_5 - sum56_7 + sum56_9)
    businessInfo.push(sum32_1 * 12 / sum56_0)
    businessInfo.push((sum56_0 - (sum57_6 + sum57_7) * 6) / sum56_0)
    businessInfo.push((sum57_6 + sum57_7) * 6)
    businessInfo.push(sum32_1 * 12 / sum61_2)
    insertNewTab(keyFinancial, businessInfo, 'key', userId, businessId)
}

async function businessInformation(userId, businessId, answers) {
    keyBusiness = await getKeyFromCatalogue(['Business Summary', 'Business Information:', '', 'tbl_business_answer'])
    businessInfo = new Array()
    sector = await getAnswerByIdCol(7, 'col_5_header', answers)
    image = await getAnswerByIdCol(2, 'col_0_header', answers)
    status = await getAnswerByIdCol(6, 'col_0_header', answers)
    year = await getAnswerByIdCol(31, 'col_5_header', answers)
    nature = await getAnswerByIdCol(8, 'col_0_header', answers)
    if (setType == 'business') {
        name = await getAnswerByIdCol(1, 'col_0_header', answers)
        cost = await getAnswerByIdCol(14, 'col_1_header', answers)
        tenure = await getAnswerByIdCol(44, 'col_1_header', answers)
        businessType = await getAnswerByIdCol(1, 'col_1_header', answers)
    } else {
        name = setType
        businessType = await getAnswerByIdCol(1, 'col_0_header', answers)
        tenure = cost = ''
    }
    businessInfo.push(name)
    businessInfo.push(sector)
    businessInfo.push(image)
    businessInfo.push(status)
    businessInfo.push(cost)
    businessInfo.push(year)
    businessInfo.push(tenure)
    businessInfo.push(nature)
    businessInfo.push(businessType)
    address = await getAnswerByIdCol(55, 'col_0_header', answers)
    if (setType == 'business') {
        setLocation(userId, businessId, address)
    }
    businessInfo.push(address)
    insertNewTab(keyBusiness, businessInfo, 'key', userId, businessId)
}

function rtrim (str, charlist) {
    charlist = !charlist ? ' \\s\u00A0' : (charlist + '')
      .replace(/([[\]().?/*{}+$^:])/g, '\\$1')
  
    re = new RegExp('[' + charlist + ']+$', 'g')
  
    return (str + '').replace(re, '')
  }

  async function getData(businessListData) {
    unSdg = new Array()
    for await (let business of businessListData) {
        count = 0
        goalNames = business['goal name'].split(',')
        goal_number = [];goal_description = [];path = [];
        for await (let data of tbl_unsdg_database) {
            for await (let goal of goalNames) {
                if (data.goal_name == goal) {
                    goal_number[count] = data.goal_number
                    goal_description[count] = data.short_description
                    path[count++] = data.path
                }
            }
        }
        unSdg.push({goal_number: goal_number, goal_description: goal_description, path: path})
    }
    var interactions = [];
    for (var i = 0; i < businessListData.length; i++) {
        var interaction = {};
        for (let j = 0; j < unSdg[i].goal_number.length; j++) {
            data = await getResult(unSdg[i].goal_number[j]);
            interaction[unSdg[i].goal_number[j]] = data;
        }
        interactions[i] = interaction;
    }
    return {unSdg: unSdg, interactions: interactions};
}

async function getResult(goal_number) {
    var result = await mysql.execute('SELECT `goal_main`, `goal_alternative_1`, `interaction_1`, `key_points`, `key_uncertainties`, `comprehensive_breakdown`, `illustrative_example_1`, `key_dimensions_1`, `key_dimensions_2`, `key_dimensions_3`, `key_dimensions_4` FROM `tbl_unsdg_goal_interactions` WHERE `goal_main` = ? OR `goal_alternative_1` = ?', [goal_number, goal_number]);
    return result[0];
}

async function getStakeholders(businessListData) {
    var stakeholders = new Array();
    stakeholders.push({country: await getStakeholderItem('Country', businessListData)})
    stakeholders.push({button3: await getStakeholderItem('Button 3', businessListData)})
    stakeholders.push({button4: await getStakeholderItem('Button 4', businessListData)})
    stakeholders.push({consideration: await getStakeholderItem('Considerations', businessListData)})
    stakeholders.push({maps: await getStakeholderMap(25, businessListData)})
    return stakeholders;
}

async function getStakeholderItem(key, businessListData) {
    var stakeholder = new Array();
    var stakeholders = new Array();
    var result = await mysql.execute("SELECT `description` FROM tbl_catalogue_summary WHERE tab = 'Sustainability Measures' AND sub_tab = 'Stakeholders' AND button_in_sub_tab = ?", [key])
    var key_info = result[0];
    result = await mysql.execute("SELECT `tbl_pull_request_1_source` FROM tbl_catalogue_summary WHERE tab = 'Sustainability Measures' AND sub_tab = 'Stakeholders' AND button_in_sub_tab = ?", [key])
    var tables = result[0];
    lastTable = '';
    try {
        for await (mainBusiness_item of businessListData) {
            index = 0
            for await (key_info_item of key_info) {
                var countryName = mainBusiness_item['country']
                var col = key_info_item['description']
                var table = tables[index++]['tbl_pull_request_1_source']
                if (table != lastTable) {
                    result = eval(table)
                    for await (content_item of content) {
                        if(content_item['country'] == countryName && content_item[col] != undefined) {
                            var result_col = {}
                            result_col[col] = content_item[col];
                            stakeholder.push(result_col);
                        }
                    }
                }
                lastTable = table;
            }
            stakeholders.push(stakeholder)
        }
    } catch { }
    return stakeholders
}

async function getStakeholderMap(id_business_quiz, businessListData) {
    var stakeholders_map = new Array()
    var stakeholders_maps = new Array()
        for await (business_item of businessListData) {
            var answer = await getAnswersForGlobal(business_item['u_id'], business_item['business_id']);
            var answersById = await getAnswerByIdForGlobal(answer, id_business_quiz)
            if (answersById[0] != undefined) {
                if (answersById[0]['col_0_header'] != null) {
                    var stakeholders = answersById[0]['col_0_header'].split(',')
                } else {
                    var stakeholders = null
                }
                if (answersById[0]['col_1_header'] != null) {
                    var rings = answersById[0]['col_1_header'].split(',')
                } else {
                    var rings = null
                }
                if (tbl_stakeholder_scoring != null) {
                    for (stakeholderRing of tbl_stakeholder_scoring) {
                        var stakeholder_map = new Array()
                        if (rings != null) {
                            for (var i = 0; i < rings.length; i++) {
                                if(stakeholderRing['ring'] == rings[i]) {
                                    stakeholder_map.push(stakeholders[i])
                                }
                            }
                        }
                        stakeholders_map[stakeholderRing['ring']] = stakeholder_map
                        stakeholders_maps[stakeholderRing['ring']] = stakeholder_map
                    }
                }
            }
        }
    return stakeholders_maps
}

async function getAnswersForGlobal(userId, businessId) {
    var result = await mysql.execute('SELECT * FROM tbl_business_answer WHERE u_id= ? AND business_id = ?', [userId, businessId]);
    return result[0];
}

async function getAnswerByIdForGlobal(answer, id_business_quiz) {
    var answersById = new Array();
    for (value of answer) {
        if(value['id_business_quiz'] == id_business_quiz) {
            answersById.push(value)
        }
    }
    return answersById;
}

function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
}