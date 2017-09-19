



const Colors = require('colors')

const AWS = require('aws-sdk')
AWS.config.update({
	region:'us-west-2'
})
const ec2 = new AWS.EC2()
const autoscaling = new AWS.AutoScaling()

OK = ' - ' + Colors.green ('OK') + '\n'
KO = ' - ' + Colors.red   ('KO') + '\n'

SECURITY_GROUP_NAME                = 'DELETE ME security group'
LAUNCH_CONFIGURATION_NAME          = 'DELETE ME launch configuration'
AUTOSCALING_GROUP_NAME             = 'DELETE ME autoscaling group'
AUTOSCALING_GROUP_DESIRED_CAPACITY = 0
AUTOSCALING_GROUP_MIN_CAPACITY     = 0
AUTOSCALING_GROUP_MAX_CAPACITY     = 1

process.stdout.write(`FETCHING available VPCs`)
ec2.describeVpcs((err, data) => {
	if (err) {
		process.stdout.write(KO)
		console.error(err, err.stack)
		return
	}

	process.stdout.write(OK)

	if (!data || !data.Vpcs || data.Vpcs.length === 0) {
		console.error('No VPC. Abort...', data)
		return
	}

	process.stdout.write(`CREATING security group "${SECURITY_GROUP_NAME}"`)
	ec2.createSecurityGroup({
	  Description: 'tmp description',
	  GroupName: SECURITY_GROUP_NAME,
	  VpcId: data.Vpcs[0].VpcId
	}, (err, data) => {
		if (err) {
			if (err.code !== 'InvalidGroup.Duplicate') {
				process.stdout.write(KO)
				console.error(err, err.stack)
				return
			}

			process.stdout.write(Colors.yellow(` - [${err.code}]\n`))
		} else {
			process.stdout.write(OK)
		}

		process.stdout.write(`FETCHING security group "${SECURITY_GROUP_NAME}"`)
		ec2.describeSecurityGroups({
		  GroupNames: [ SECURITY_GROUP_NAME ]
		}, (err, data) => {
		  if (err) {
		  	console.error(err, err.stack)
		  	process.stdout.write(KO)
		  	return
		  }

		  process.stdout.write(OK)

		  if ( !data
		  	|| !data.SecurityGroups
		  	|| !data.SecurityGroups[0]
		  	|| !data.SecurityGroups[0].GroupId) {
		  	process.stdout.write(KO)
		  	console.error('No security group. Abort...', data)
		  	return
		  }

		  const securityGroupId = data.SecurityGroups[0].GroupId

		  process.stdout.write(`CREATING launch configuration "${LAUNCH_CONFIGURATION_NAME}"`)
		  autoscaling.createLaunchConfiguration({
				ImageId: 'ami-6e1a0117', // ubuntu
				InstanceType: 't2.micro',
				LaunchConfigurationName: LAUNCH_CONFIGURATION_NAME,
				SecurityGroups: [
					securityGroupId
				]
			}, (err, data) => {
				if (err) {
					if (err.code !== 'AlreadyExists') {
						process.stdout.write(KO)
						console.error(err, err.stack)
						return
					}

					process.stdout.write(Colors.yellow(` - [${err.code}]\n`))
				} else {
					process.stdout.write(OK)
				}

				process.stdout.write(`FETCHING launch configuration "${LAUNCH_CONFIGURATION_NAME}"`)
				autoscaling.describeLaunchConfigurations({
					LaunchConfigurationNames: [
						LAUNCH_CONFIGURATION_NAME
					]
				}, (err, data) => {
					if (err) {
						process.stdout.write(KO)
						console.error(err, err.stack)
						return
					}

					process.stdout.write(OK)

					process.stdout.write(`CREATING autoscaling group "${AUTOSCALING_GROUP_NAME}"`)
					autoscaling.createAutoScalingGroup({
						AutoScalingGroupName: AUTOSCALING_GROUP_NAME,
						LaunchConfigurationName: LAUNCH_CONFIGURATION_NAME,
						MaxSize: AUTOSCALING_GROUP_MAX_CAPACITY,
						MinSize: AUTOSCALING_GROUP_MIN_CAPACITY,
						DesiredCapacity: AUTOSCALING_GROUP_DESIRED_CAPACITY,
						AvailabilityZones: [
							'us-west-2a'
						]
					}, (err, data) => {
						if (err) {
							if (err.code !== 'AlreadyExists') {
								process.stdout.write(KO)
								console.error(err, err.stack)
								return
							}

							process.stdout.write(Colors.yellow(` - [${err.code}]\n`))
						} else {
							process.stdout.write(OK)
						}

						process.stdout.write(`FETCHING autoscaling group "${AUTOSCALING_GROUP_NAME}"`)
						autoscaling.describeAutoScalingGroups({
							AutoScalingGroupNames: [
								AUTOSCALING_GROUP_NAME
							]
						}, (err, data) => {
							if (err) {
								process.stdout.write(KO)
								console.error(err, err.stack)
								return
							}

							process.stdout.write(OK)

							process.stdout.write(` DESIRED capacity set to ${AUTOSCALING_GROUP_DESIRED_CAPACITY}`)
							autoscaling.setDesiredCapacity({
								AutoScalingGroupName: AUTOSCALING_GROUP_NAME,
								DesiredCapacity: AUTOSCALING_GROUP_DESIRED_CAPACITY
							}, (err, data) => {
								if (err) {
									process.stdout.write(KO)
									console.error(err, err.stack)
									return
								}

								process.stdout.write(OK)

								process.stdout.write(`FETCHING autoscaling group "${AUTOSCALING_GROUP_NAME}"`)
								autoscaling.describeAutoScalingGroups({
									AutoScalingGroupNames: [
										AUTOSCALING_GROUP_NAME
									]
								}, (err, data) => {
									if (err) {
										process.stdout.write(KO)
										console.error(err, err.stack)
										return
									}

									process.stdout.write(OK)

									console.log(data.AutoScalingGroups[0].Instances.map(i => {
										return i.InstanceId + ' ' + i.HealthStatus
									}))
								})
							})
						})
					})
				})
		  })
		})
	})
})

